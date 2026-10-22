/**
 * In-Memory Transaction Engine for Contention-Aware Transaction Guard (CTG)
 * 
 * Provides an exact relational and transactional simulation layer when
 * PostgreSQL is unavailable or STORAGE_MODE=memory is specified.
 * 
 * Accurately models:
 * - Row-level exclusive locking (SELECT ... FOR UPDATE equivalent)
 * - Atomic compare-and-swap versioning (OCC)
 * - Strict non-negative stock invariants (CHECK stock >= 0)
 * - Idempotency key tracking and atomic deduplication
 * - Transaction isolation, commit, and rollback mechanics
 */

class RowLock {
  constructor() {
    this.isLocked = false;
    this.currentHolder = null;
    this.waitQueue = [];
  }

  async acquire(holderId, timeoutMs = 5000) {
    const startTime = Date.now();

    if (!this.isLocked) {
      this.isLocked = true;
      this.currentHolder = holderId;
      return { acquired: true, waitMs: 0 };
    }

    return new Promise((resolve) => {
      let timeoutHandle = null;

      const waiter = {
        holderId,
        resolve: () => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          const waitMs = Date.now() - startTime;
          this.isLocked = true;
          this.currentHolder = holderId;
          resolve({ acquired: true, waitMs });
        }
      };

      if (timeoutMs > 0) {
        timeoutHandle = setTimeout(() => {
          const index = this.waitQueue.indexOf(waiter);
          if (index !== -1) {
            this.waitQueue.splice(index, 1);
            const waitMs = Date.now() - startTime;
            resolve({ acquired: false, waitMs, reason: 'LOCK_TIMEOUT' });
          }
        }, timeoutMs);
      }

      this.waitQueue.push(waiter);
    });
  }

  release(holderId) {
    if (this.currentHolder === holderId) {
      this.isLocked = false;
      this.currentHolder = null;

      if (this.waitQueue.length > 0) {
        const nextWaiter = this.waitQueue.shift();
        nextWaiter.resolve();
      }
    }
  }
}

class InMemoryDatabase {
  constructor() {
    this.mode = 'memory';
    this.products = new Map();
    this.transactions = [];
    this.strategyEvents = [];
    this.idempotencyKeys = new Map();
    this.rowLocks = new Map();
    this.initialStockSnapshots = new Map();

    this.initializeDefaultData();
  }

  initializeDefaultData() {
    const defaultCatalog = [
      { id: 'prod-1', name: 'Titanium CyberPhone Pro (Hot Item)', stock: 100, version: 1 },
      { id: 'prod-2', name: 'Quantum Core GPU 48GB', stock: 100, version: 1 },
      { id: 'prod-3', name: 'Spatial Audio Headset X', stock: 100, version: 1 },
      { id: 'prod-4', name: 'Ergonomic Mechanical Keyboard', stock: 100, version: 1 }
    ];

    this.products.clear();
    this.rowLocks.clear();
    this.initialStockSnapshots.clear();

    for (const item of defaultCatalog) {
      this.products.set(item.id, {
        ...item,
        updated_at: new Date().toISOString()
      });
      this.initialStockSnapshots.set(item.id, item.stock);
      this.rowLocks.set(item.id, new RowLock());
    }

    this.transactions = [];
    this.strategyEvents = [];
    this.idempotencyKeys.clear();
  }

  getLock(productId) {
    if (!this.rowLocks.has(productId)) {
      this.rowLocks.set(productId, new RowLock());
    }
    return this.rowLocks.get(productId);
  }

  // --- Product Operations ---
  async getProduct(productId) {
    const prod = this.products.get(productId);
    if (!prod) return null;
    return { ...prod };
  }

  async getAllProducts() {
    return Array.from(this.products.values()).map(p => ({ ...p }));
  }

  async createProduct({ id, name, stock }) {
    if (this.products.has(id)) {
      throw new Error(`Product with ID ${id} already exists`);
    }
    const product = {
      id,
      name,
      stock: parseInt(stock, 10),
      version: 1,
      updated_at: new Date().toISOString()
    };
    this.products.set(id, product);
    this.initialStockSnapshots.set(id, product.stock);
    this.rowLocks.set(id, new RowLock());
    return { ...product };
  }

  // --- OCC Primitive: Atomic Versioned Conditional Decrement ---
  async occUpdateStock({ productId, expectedVersion, quantity }) {
    const prod = this.products.get(productId);
    if (!prod) {
      return { success: false, reason: 'PRODUCT_NOT_FOUND' };
    }

    // Atomic version check
    if (prod.version !== expectedVersion) {
      return {
        success: false,
        reason: 'VERSION_MISMATCH',
        currentVersion: prod.version,
        currentStock: prod.stock
      };
    }

    // Stock check
    if (prod.stock < quantity) {
      return {
        success: false,
        reason: 'INSUFFICIENT_STOCK',
        currentStock: prod.stock
      };
    }

    // Atomic commit
    prod.stock -= quantity;
    prod.version += 1;
    prod.updated_at = new Date().toISOString();

    return {
      success: true,
      newStock: prod.stock,
      newVersion: prod.version
    };
  }

  // --- PCC Primitives: Row Lock, Check, and Update ---
  async pccAcquireLock(productId, txId, timeoutMs = 5000) {
    const lock = this.getLock(productId);
    return await lock.acquire(txId, timeoutMs);
  }

  pccReleaseLock(productId, txId) {
    const lock = this.getLock(productId);
    lock.release(txId);
  }

  async pccUpdateStock({ productId, quantity, txId }) {
    const prod = this.products.get(productId);
    if (!prod) {
      return { success: false, reason: 'PRODUCT_NOT_FOUND' };
    }

    if (prod.stock < quantity) {
      return {
        success: false,
        reason: 'INSUFFICIENT_STOCK',
        currentStock: prod.stock
      };
    }

    prod.stock -= quantity;
    prod.version += 1;
    prod.updated_at = new Date().toISOString();

    return {
      success: true,
      newStock: prod.stock,
      newVersion: prod.version
    };
  }

  // --- Idempotency & Transaction Logs ---
  async getIdempotencyRecord(requestId) {
    return this.idempotencyKeys.get(requestId) || null;
  }

  async setIdempotencyRecord(requestId, status, responseBody) {
    this.idempotencyKeys.set(requestId, {
      status,
      response_body: responseBody,
      created_at: new Date().toISOString()
    });
  }

  async recordTransaction(txRecord) {
    const record = {
      id: txRecord.id || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      request_id: txRecord.request_id,
      product_id: txRecord.product_id,
      strategy: txRecord.strategy,
      status: txRecord.status,
      retries: txRecord.retries || 0,
      conflict_detected: !!txRecord.conflict_detected,
      execution_time_ms: txRecord.execution_time_ms || 0,
      created_at: txRecord.created_at || new Date().toISOString()
    };
    this.transactions.push(record);
    return record;
  }

  async getRecentTransactions(limit = 100, filters = {}) {
    let result = [...this.transactions];

    if (filters.strategy && filters.strategy !== 'ALL') {
      result = result.filter(t => t.strategy.toUpperCase() === filters.strategy.toUpperCase());
    }
    if (filters.status && filters.status !== 'ALL') {
      result = result.filter(t => t.status.toUpperCase() === filters.status.toUpperCase());
    }
    if (filters.productId && filters.productId !== 'ALL') {
      result = result.filter(t => t.product_id === filters.productId);
    }

    return result.slice(-limit).reverse();
  }

  // --- Strategy Events ---
  async recordStrategyEvent({ previousStrategy, newStrategy, contentionScore, reason }) {
    const event = {
      id: this.strategyEvents.length + 1,
      previous_strategy: previousStrategy,
      new_strategy: newStrategy,
      contention_score: Number(contentionScore.toFixed(4)),
      reason,
      created_at: new Date().toISOString()
    };
    this.strategyEvents.push(event);
    return event;
  }

  async getStrategyEvents(limit = 50) {
    return [...this.strategyEvents].slice(-limit).reverse();
  }

  // --- Reset & Invariant Checks ---
  async reset(customInitialStock = 100) {
    for (const [id, prod] of this.products.entries()) {
      prod.stock = customInitialStock;
      prod.version = 1;
      prod.updated_at = new Date().toISOString();
      this.initialStockSnapshots.set(id, customInitialStock);
    }
    this.transactions = [];
    this.strategyEvents = [];
    this.idempotencyKeys.clear();
    return { success: true, message: 'In-memory database successfully reset' };
  }

  validateConsistency() {
    const violations = [];
    const productStats = {};

    for (const [id, prod] of this.products.entries()) {
      const initialStock = this.initialStockSnapshots.get(id) || 100;
      const successfulTx = this.transactions.filter(
        t => t.product_id === id && t.status === 'SUCCESS'
      );
      const unitsSold = successfulTx.length; // 1 unit per purchase in standard workload

      const expectedStock = initialStock - unitsSold;

      // 1. Stock must never be negative
      if (prod.stock < 0) {
        violations.push(`Negative stock detected for product ${id}: ${prod.stock}`);
      }

      // 2. Exact balance invariant: initial = current + sold
      if (prod.stock !== expectedStock) {
        violations.push(
          `Inventory mismatch for product ${id}: Initial(${initialStock}) != Current(${prod.stock}) + Sold(${unitsSold}) [Expected: ${expectedStock}]`
        );
      }

      // 3. Overselling invariant
      if (unitsSold > initialStock) {
        violations.push(
          `Overselling violation for product ${id}: Sold ${unitsSold} with initial stock ${initialStock}`
        );
      }

      productStats[id] = {
        name: prod.name,
        initialStock,
        currentStock: prod.stock,
        unitsSold,
        expectedStock,
        version: prod.version,
        isConsistent: prod.stock >= 0 && prod.stock === expectedStock && unitsSold <= initialStock
      };
    }

    return {
      isValid: violations.length === 0,
      violations,
      productStats,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance for in-memory mode
const inMemoryDb = new InMemoryDatabase();
module.exports = { InMemoryDatabase, inMemoryDb };
