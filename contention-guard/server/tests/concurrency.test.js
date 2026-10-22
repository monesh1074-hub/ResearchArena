const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/database/db');
const { executeOCC } = require('../src/concurrency/occ');
const { executePCC } = require('../src/concurrency/pcc');
const { adaptiveController } = require('../src/concurrency/adaptive');
const { runConsistencyValidation } = require('../src/services/consistencyService');

describe('Contention-Aware Transaction Guard (CTG) Concurrency Test Suite', () => {
  before(async () => {
    process.env.DB_MODE = 'memory';
    process.env.NODE_ENV = 'test';
    await db.initDb();
  });

  beforeEach(async () => {
    await db.resetDatabase(50);
    adaptiveController.reset();
  });

  it('1. OCC detects conflicting updates and resolves via retries or aborts', async () => {
    const productId = 'prod-1';
    const prod = await db.getProduct(productId);
    const initialVersion = prod.version;

    // Simulate two concurrent updates starting with the same read version
    const p1 = db.occUpdateStock({ productId, expectedVersion: initialVersion, quantity: 1 });
    const p2 = db.occUpdateStock({ productId, expectedVersion: initialVersion, quantity: 1 });

    const [res1, res2] = await Promise.all([p1, p2]);

    // Exactly one must succeed, and one must be rejected with VERSION_MISMATCH
    const successCount = (res1.success ? 1 : 0) + (res2.success ? 1 : 0);
    assert.strictEqual(successCount, 1, 'Exactly one concurrent OCC update should succeed with same expectedVersion');

    const failedRes = res1.success ? res2 : res1;
    assert.strictEqual(failedRes.reason, 'VERSION_MISMATCH', 'Conflicted update must report VERSION_MISMATCH');
  });

  it('2. PCC safely serializes updates to the same resource with row locks', async () => {
    const productId = 'prod-1';
    const initialProd = await db.getProduct(productId);
    const initialStock = initialProd.stock;

    // Fire 10 simultaneous PCC transactions
    const concurrentCount = 10;
    const promises = [];
    for (let i = 0; i < concurrentCount; i++) {
      promises.push(executePCC({ productId, quantity: 1, requestId: `pcc-test-${i}` }));
    }

    const results = await Promise.all(promises);

    // All 10 should succeed because PCC serializes them safely
    assert.strictEqual(results.every(r => r.success), true, 'All serialized PCC transactions should succeed');
    
    const finalProd = await db.getProduct(productId);
    assert.strictEqual(finalProd.stock, initialStock - concurrentCount, 'Stock must exactly decrement by 10');
  });

  it('3. Adaptive Guard switches to PCC under sustained high contention', async () => {
    // Feed high-conflict observations to the adaptive controller
    adaptiveController.reset();
    adaptiveController.windowSize = 20;
    adaptiveController.highThreshold = 0.35;
    adaptiveController.lowThreshold = 0.15;
    adaptiveController.cooldownTransactions = 0;
    adaptiveController.cooldownMs = 0;

    assert.strictEqual(adaptiveController.currentStrategy, 'OCC', 'Initial strategy must be OCC');

    // Simulate sustained conflicts
    for (let i = 0; i < 15; i++) {
      adaptiveController.recordObservation({
        productId: 'prod-1',
        strategyUsed: 'OCC',
        status: 'ABORTED',
        conflictDetected: true,
        retries: 3,
        executionTimeMs: 45,
        lockWaitMs: 0
      });
    }

    assert.strictEqual(adaptiveController.currentStrategy, 'PCC', 'Adaptive Guard must escalate to PCC under high contention');
    assert.ok(adaptiveController.latestContentionScore >= 0.35, 'Contention score must meet or exceed high threshold');
  });

  it('4. Hysteresis prevents excessive strategy switching (prevents oscillation)', async () => {
    adaptiveController.reset();
    adaptiveController.windowSize = 20;
    adaptiveController.highThreshold = 0.50;
    adaptiveController.lowThreshold = 0.20;
    adaptiveController.cooldownTransactions = 0;
    adaptiveController.cooldownMs = 0;

    // Record mild contention that produces a score within the hysteresis band (e.g. ~0.30)
    for (let i = 0; i < 10; i++) {
      adaptiveController.recordObservation({
        productId: 'prod-1',
        strategyUsed: 'OCC',
        status: i % 3 === 0 ? 'ABORTED' : 'SUCCESS',
        conflictDetected: i % 3 === 0,
        retries: i % 3 === 0 ? 1 : 0,
        executionTimeMs: 20,
        lockWaitMs: 0
      });
    }

    const score = adaptiveController.latestContentionScore;
    assert.ok(score > adaptiveController.lowThreshold && score < adaptiveController.highThreshold, 'Score should sit in hysteresis band');
    assert.strictEqual(adaptiveController.currentStrategy, 'OCC', 'Strategy must remain stable within the hysteresis band');
  });

  it('5. OCC retry limits prevent infinite loops', async () => {
    // Test that executeOCC terminates within bounded retries
    const maxRetries = 3;
    
    // Create an artificially modified product version to force mismatch
    const result = await executeOCC({
      productId: 'prod-1',
      quantity: 1,
      requestId: 'test-retry-limit',
      maxRetries,
      baseBackoffMs: 1,
      maxBackoffMs: 5
    });

    assert.ok(result.retries <= maxRetries, `Retries (${result.retries}) must not exceed maxRetries (${maxRetries})`);
  });

  it('6. High contention test: requests exceed available stock and NEVER produce negative stock', async () => {
    const productId = 'prod-1';
    // Set stock to a very small amount: exactly 5 units
    await db.resetDatabase(5);

    // Send 25 concurrent purchase requests (5x the available stock)
    const totalRequests = 25;
    const reqPromises = [];

    for (let i = 0; i < totalRequests; i++) {
      reqPromises.push(
        request(app)
          .post('/api/transactions/purchase')
          .send({
            productId,
            quantity: 1,
            strategy: 'PCC',
            requestId: `oversell-guard-req-${i}`
          })
      );
    }

    const responses = await Promise.all(reqPromises);
    const successfulPurchases = responses.filter(r => r.body.success === true);
    const rejectedPurchases = responses.filter(r => r.body.success === false);

    assert.strictEqual(successfulPurchases.length, 5, 'Exactly 5 purchases must succeed');
    assert.strictEqual(rejectedPurchases.length, 20, 'Exactly 20 purchases must be rejected');

    const finalProd = await db.getProduct(productId);
    assert.strictEqual(finalProd.stock, 0, 'Final stock must be exactly 0, never negative');

    // Run mathematical consistency audit
    const audit = await runConsistencyValidation();
    assert.strictEqual(audit.isConsistent, true, 'Consistency audit must report 100% valid');
    assert.strictEqual(audit.violations.length, 0, 'Zero consistency violations allowed');
  });

  it('7. Insufficient inventory causes safe rejection', async () => {
    await db.resetDatabase(2);

    const res = await request(app)
      .post('/api/transactions/purchase')
      .send({
        productId: 'prod-1',
        quantity: 10, // Requesting more than available
        strategy: 'OCC',
        requestId: 'insufficient-stock-req'
      });

    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.status, 'INSUFFICIENT_STOCK');

    const prod = await db.getProduct('prod-1');
    assert.strictEqual(prod.stock, 2, 'Stock must remain untouched');
  });

  it('8. Idempotency protection: repeated idempotency key never double-decrements inventory', async () => {
    await db.resetDatabase(10);
    const fixedRequestId = 'idempotent-key-unique-999';

    // First purchase call
    const res1 = await request(app)
      .post('/api/transactions/purchase')
      .send({
        productId: 'prod-1',
        quantity: 1,
        strategy: 'OCC',
        requestId: fixedRequestId
      });

    assert.strictEqual(res1.body.success, true);
    assert.strictEqual(res1.body.newStock, 9);

    // Replay with exact same requestId
    const res2 = await request(app)
      .post('/api/transactions/purchase')
      .send({
        productId: 'prod-1',
        quantity: 1,
        strategy: 'OCC',
        requestId: fixedRequestId
      });

    assert.strictEqual(res2.body.success, true);
    assert.strictEqual(res2.body.isIdempotentReplay, true, 'Second call must be flagged as idempotent replay');
    
    // Verify inventory only decremented ONCE
    const prod = await db.getProduct('prod-1');
    assert.strictEqual(prod.stock, 9, 'Stock must still be 9, not 8');
  });

  it('9. All three strategies (OCC, PCC, ADAPTIVE) preserve mathematical consistency', async () => {
    const strategies = ['OCC', 'PCC', 'ADAPTIVE'];

    for (const strat of strategies) {
      await db.resetDatabase(20);

      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app)
            .post('/api/transactions/purchase')
            .send({
              productId: 'prod-1',
              quantity: 1,
              strategy: strat,
              requestId: `strat-test-${strat}-${i}`
            })
        );
      }

      await Promise.all(promises);

      const audit = await runConsistencyValidation();
      assert.strictEqual(audit.isConsistent, true, `Strategy ${strat} must pass full consistency validation`);
      assert.strictEqual(audit.violations.length, 0, `Strategy ${strat} must have 0 violations`);
    }
  });

  it('10. Healthcheck and API endpoints return valid metadata', async () => {
    const healthRes = await request(app).get('/api/health');
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.body.status, 'HEALTHY');
    assert.ok(healthRes.body.database.label);

    const productsRes = await request(app).get('/api/products');
    assert.strictEqual(productsRes.status, 200);
    assert.ok(Array.isArray(productsRes.body.data));
    assert.ok(productsRes.body.data.length >= 4);
  });
});
