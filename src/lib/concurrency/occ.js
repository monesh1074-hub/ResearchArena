/**
 * Optimistic Concurrency Control (OCC) Implementation
 * 
 * Mechanism:
 * 1. Read product and its current version.
 * 2. Conditionally update stock where id = $1 AND version = $2 AND stock >= $3.
 * 3. If version mismatch occurs (conflict detected), apply bounded exponential backoff with jitter and retry.
 * 4. If max retries exceeded, abort transaction with CONFLICT status.
 * 5. If stock is insufficient, abort safely without retrying.
 */

const db = require('../database/db');

// Sleep helper with jittered backoff
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function executeOCC({
  productId,
  quantity = 1,
  requestId,
  maxRetries = parseInt(process.env.OCC_MAX_RETRIES || '4', 10),
  baseBackoffMs = parseInt(process.env.OCC_BASE_BACKOFF_MS || '5', 10),
  maxBackoffMs = parseInt(process.env.OCC_MAX_BACKOFF_MS || '100', 10)
}) {
  const startTime = Date.now();
  let attempts = 0;
  let conflictDetected = false;
  let lastFailureReason = null;

  while (attempts <= maxRetries) {
    // 1. Read phase: fetch product and version
    const product = await db.getProduct(productId);
    if (!product) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        status: 'PRODUCT_NOT_FOUND',
        strategy: 'OCC',
        retries: attempts,
        conflictDetected,
        executionTimeMs,
        message: `Product ${productId} not found`
      };
    }

    // Fast-fail if stock already insufficient
    if (product.stock < quantity) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        status: 'INSUFFICIENT_STOCK',
        strategy: 'OCC',
        retries: attempts,
        conflictDetected,
        executionTimeMs,
        currentStock: product.stock,
        message: `Insufficient stock for product ${productId}. Available: ${product.stock}, Requested: ${quantity}`
      };
    }

    const expectedVersion = product.version;

    // 2. Validate & Write phase: atomic conditional decrement
    const updateResult = await db.occUpdateStock({
      productId,
      expectedVersion,
      quantity
    });

    if (updateResult.success) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: true,
        status: 'SUCCESS',
        strategy: 'OCC',
        retries: attempts,
        conflictDetected,
        executionTimeMs,
        newStock: updateResult.newStock,
        newVersion: updateResult.newVersion,
        message: 'Transaction committed successfully under OCC'
      };
    }

    // Validation failed -> Conflict or Insufficient stock during race
    conflictDetected = true;
    lastFailureReason = updateResult.reason;

    if (updateResult.reason === 'INSUFFICIENT_STOCK') {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        status: 'INSUFFICIENT_STOCK',
        strategy: 'OCC',
        retries: attempts,
        conflictDetected: true,
        executionTimeMs,
        currentStock: updateResult.currentStock || 0,
        message: 'Stock exhausted during concurrent transaction'
      };
    }

    // If version mismatch and retries left, compute backoff with full jitter
    attempts += 1;
    if (attempts <= maxRetries) {
      // Exponential backoff: base * 2^(attempts-1) with random jitter
      const expBackoff = Math.min(maxBackoffMs, baseBackoffMs * Math.pow(2, attempts - 1));
      const jitteredBackoff = Math.floor(Math.random() * expBackoff);
      await sleep(jitteredBackoff);
    }
  }

  // Max retries exceeded -> Abort transaction
  const executionTimeMs = Date.now() - startTime;
  return {
    success: false,
    status: 'ABORTED',
    strategy: 'OCC',
    retries: attempts - 1,
    conflictDetected: true,
    executionTimeMs,
    message: `OCC validation failed after ${attempts - 1} retries due to persistent write contention (${lastFailureReason})`
  };
}

module.exports = { executeOCC };
