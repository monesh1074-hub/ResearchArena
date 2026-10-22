/**
 * Pessimistic Concurrency Control (PCC) Implementation
 * 
 * Mechanism:
 * 1. Acquire an exclusive row lock on the target product (PostgreSQL SELECT ... FOR UPDATE or mutex queue).
 * 2. Record lock wait time.
 * 3. Safely verify available stock within the critical section.
 * 4. Decrement inventory atomically and commit transaction.
 * 5. If stock is insufficient, abort/rollback safely without modifying state.
 * 6. Always release locks reliably via finally block.
 */

const db = require('../database/db');

async function executePCC({
  productId,
  quantity = 1,
  requestId
}) {
  const startTime = Date.now();
  const txId = requestId || `tx-pcc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  try {
    const result = await db.pccExecuteTransaction(productId, quantity, txId);
    const executionTimeMs = Date.now() - startTime;

    if (!result.success) {
      if (result.reason === 'INSUFFICIENT_STOCK') {
        return {
          success: false,
          status: 'INSUFFICIENT_STOCK',
          strategy: 'PCC',
          retries: 0,
          conflictDetected: false,
          lockWaitMs: result.lockWaitMs || 0,
          executionTimeMs,
          currentStock: result.currentStock || 0,
          message: `Insufficient stock under PCC lock. Available: ${result.currentStock}`
        };
      }

      if (result.reason === 'LOCK_TIMEOUT') {
        return {
          success: false,
          status: 'ABORTED',
          strategy: 'PCC',
          retries: 0,
          conflictDetected: true,
          lockWaitMs: result.lockWaitMs || 0,
          executionTimeMs,
          message: 'PCC lock acquisition timed out due to high lock contention'
        };
      }

      return {
        success: false,
        status: 'ABORTED',
        strategy: 'PCC',
        retries: 0,
        conflictDetected: false,
        lockWaitMs: result.lockWaitMs || 0,
        executionTimeMs,
        message: `PCC transaction failed: ${result.reason}`
      };
    }

    return {
      success: true,
      status: 'SUCCESS',
      strategy: 'PCC',
      retries: 0,
      conflictDetected: false,
      lockWaitMs: result.lockWaitMs || 0,
      executionTimeMs,
      newStock: result.newStock,
      newVersion: result.newVersion,
      message: 'Transaction committed successfully under PCC'
    };
  } catch (err) {
    const executionTimeMs = Date.now() - startTime;
    return {
      success: false,
      status: 'ABORTED',
      strategy: 'PCC',
      retries: 0,
      conflictDetected: true,
      executionTimeMs,
      message: `PCC transaction aborted: ${err.message}`
    };
  }
}

module.exports = { executePCC };
