const db = require('../database/db');
const { purchaseProduct } = require('../services/inventoryService');
const { metricsCollector } = require('../metrics/metricsCollector');
const { adaptiveController } = require('../concurrency/adaptive');

async function executePurchase(req, res, next) {
  try {
    const { productId, quantity = 1, strategy = 'ADAPTIVE', requestId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required'
      });
    }

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'quantity must be a positive integer'
      });
    }

    const result = await purchaseProduct({
      productId,
      quantity: numQty,
      strategy,
      requestId
    });

    // Record in global metrics
    metricsCollector.recordTransactionMetrics({
      status: result.status,
      conflictDetected: result.conflictDetected,
      retries: result.retries,
      executionTimeMs: result.executionTimeMs,
      contentionScore: result.adaptiveDetails ? result.adaptiveDetails.contentionScore : adaptiveController.latestContentionScore
    });

    const statusCode = result.success ? 200 : (result.status === 'INSUFFICIENT_STOCK' ? 409 : 409);
    res.status(statusCode).json(result);
  } catch (err) {
    next(err);
  }
}

async function getRecentTransactions(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const { strategy, status, productId } = req.query;

    const transactions = await db.getRecentTransactions(limit, {
      strategy,
      status,
      productId
    });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  executePurchase,
  getRecentTransactions
};
