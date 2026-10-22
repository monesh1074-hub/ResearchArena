/**
 * Inventory Transaction Service
 * 
 * Provides unified transactional purchase execution with:
 * - Strict Idempotency key checking (prevents double-purchases on retries)
 * - Concurrency strategy routing (OCC, PCC, ADAPTIVE)
 * - Persistent transaction auditing
 * - Accurate latency and conflict telemetry
 */

const crypto = require('crypto');
const db = require('../database/db');
const { executeOCC } = require('../concurrency/occ');
const { executePCC } = require('../concurrency/pcc');
const { adaptiveController } = require('../concurrency/adaptive');

async function purchaseProduct({
  productId,
  quantity = 1,
  strategy = 'ADAPTIVE',
  requestId
}) {
  const effectiveRequestId = requestId || `req-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const normalizedStrategy = (strategy || 'ADAPTIVE').toUpperCase();

  // 1. Idempotency Check
  const existingRecord = await db.getIdempotencyRecord(effectiveRequestId);
  if (existingRecord) {
    let parsedBody = existingRecord.response_body;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch (_) { }
    }
    return {
      ...parsedBody,
      isIdempotentReplay: true,
      message: 'Idempotent request replay: previously completed result returned'
    };
  }

  // Register in-flight request
  await db.setIdempotencyRecord(effectiveRequestId, 'PROCESSING', null).catch(() => {});

  let result;
  const startTs = Date.now();

  try {
    // 2. Route by Strategy
    if (normalizedStrategy === 'OCC') {
      result = await executeOCC({ productId, quantity, requestId: effectiveRequestId });
    } else if (normalizedStrategy === 'PCC') {
      result = await executePCC({ productId, quantity, requestId: effectiveRequestId });
    } else if (normalizedStrategy === 'ADAPTIVE') {
      result = await adaptiveController.executeAdaptive({ productId, quantity, requestId: effectiveRequestId });
    } else {
      throw new Error(`Invalid concurrency control strategy: ${strategy}. Supported: OCC, PCC, ADAPTIVE`);
    }

    // 3. Persist Transaction Record
    const txRecord = {
      id: `tx-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      request_id: effectiveRequestId,
      product_id: productId,
      strategy: result.adaptiveDecision ? `ADAPTIVE(${result.adaptiveDecision.routedStrategy})` : normalizedStrategy,
      status: result.status,
      retries: result.retries || 0,
      conflict_detected: !!result.conflictDetected,
      execution_time_ms: result.executionTimeMs || (Date.now() - startTs),
      created_at: new Date().toISOString()
    };

    await db.recordTransaction(txRecord).catch(err => {
      console.error('[InventoryService] Failed to record transaction:', err.message);
    });

    const finalResponse = {
      success: result.success,
      status: result.status,
      transactionId: txRecord.id,
      requestId: effectiveRequestId,
      productId,
      strategy: normalizedStrategy,
      routedStrategy: result.adaptiveDecision ? result.adaptiveDecision.routedStrategy : normalizedStrategy,
      retries: result.retries || 0,
      conflictDetected: !!result.conflictDetected,
      executionTimeMs: result.executionTimeMs,
      lockWaitMs: result.lockWaitMs || 0,
      newStock: result.newStock !== undefined ? result.newStock : null,
      newVersion: result.newVersion !== undefined ? result.newVersion : null,
      adaptiveDetails: result.adaptiveDecision || null,
      message: result.message
    };

    // 4. Save Final Idempotency State
    await db.setIdempotencyRecord(effectiveRequestId, 'COMPLETED', finalResponse).catch(() => {});

    return finalResponse;
  } catch (err) {
    const errorResponse = {
      success: false,
      status: 'SYSTEM_ERROR',
      requestId: effectiveRequestId,
      productId,
      strategy: normalizedStrategy,
      executionTimeMs: Date.now() - startTs,
      message: err.message
    };

    await db.setIdempotencyRecord(effectiveRequestId, 'FAILED', errorResponse).catch(() => {});
    throw err;
  }
}

module.exports = { purchaseProduct };
