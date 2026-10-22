const db = require('../database/db');
const { metricsCollector } = require('../metrics/metricsCollector');
const { adaptiveController } = require('../concurrency/adaptive');
const { runConsistencyValidation } = require('../services/consistencyService');

function getHealth(req, res) {
  const dbStatus = db.getDbStatus();
  res.json({
    status: 'HEALTHY',
    service: 'Contention-Aware Transaction Guard (CTG)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus
  });
}

function getAggregatedMetrics(req, res) {
  const metrics = metricsCollector.getMetricsSummary();
  const adaptiveStatus = adaptiveController.getStatus();
  const dbStatus = db.getDbStatus();

  res.json({
    success: true,
    data: {
      metrics,
      adaptive: adaptiveStatus,
      database: dbStatus,
      comparison: metricsCollector.getComparisonResults()
    }
  });
}

async function getStrategyEvents(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const events = await db.getStrategyEvents(limit);
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (err) {
    next(err);
  }
}

function getAdaptiveStatus(req, res) {
  res.json({
    success: true,
    data: adaptiveController.getStatus()
  });
}

function updateAdaptiveConfig(req, res) {
  const updated = adaptiveController.updateConfig(req.body);
  res.json({
    success: true,
    message: 'Adaptive Guard configuration updated',
    data: updated
  });
}

async function getConsistencyReport(req, res, next) {
  try {
    const report = await runConsistencyValidation();
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHealth,
  getAggregatedMetrics,
  getStrategyEvents,
  getAdaptiveStatus,
  updateAdaptiveConfig,
  getConsistencyReport
};
