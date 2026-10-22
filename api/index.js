const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('../src/lib/database/db');
const { purchaseProduct } = require('../src/lib/services/inventoryService');
const { workloadSimulator } = require('../src/lib/simulator/workloadSimulator');
const { metricsCollector } = require('../src/lib/metrics/metricsCollector');
const { adaptiveController } = require('../src/lib/concurrency/adaptive');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const router = express.Router();

// Health
router.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Contention-Aware Transaction Guard (CTG)',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    database: db.getDbStatus()
  });
});

// Products
router.get('/products', async (req, res) => {
  try {
    const products = await db.getAllProducts();
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { id, name, stock } = req.body;
    if (!id || !name || stock === undefined) {
      return res.status(400).json({ success: false, error: 'id, name, and stock are required' });
    }
    const created = await db.createProduct({ id: String(id).trim(), name: String(name).trim(), stock: parseInt(stock, 10) });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Transactions
router.post('/transactions/purchase', async (req, res) => {
  try {
    const { productId, quantity = 1, strategy = 'ADAPTIVE', requestId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId is required' });
    }
    const result = await purchaseProduct({ productId, quantity: parseInt(quantity, 10), strategy, requestId });
    res.status(result.status === 'SUCCESS' ? 200 : 409).json({ success: result.status === 'SUCCESS', data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const strategy = req.query.strategy || 'ALL';
    const status = req.query.status || 'ALL';
    const productId = req.query.productId || 'ALL';

    const data = await db.getRecentTransactions(limit, { strategy, status, productId });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simulator Controls
router.post('/simulation/start', async (req, res) => {
  try {
    const status = await workloadSimulator.startSimulation(req.body || {});
    res.json({ success: true, message: 'Workload simulation started', data: status });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/simulation/stop', (req, res) => {
  const status = workloadSimulator.stopSimulation();
  res.json({ success: true, message: 'Simulation stop signal sent', data: status });
});

router.post('/simulation/reset', async (req, res) => {
  try {
    const { initialInventory = 100 } = req.body || {};
    workloadSimulator.stopSimulation();
    await db.resetDatabase(parseInt(initialInventory, 10));
    adaptiveController.reset();
    metricsCollector.reset();
    res.json({ success: true, message: 'Simulation and database state reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/simulation/compare', async (req, res) => {
  try {
    const results = await workloadSimulator.runComparisonBenchmark(req.body || {});
    res.json({ success: true, message: 'Comparison benchmark complete', data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/simulation/status', (req, res) => {
  res.json({ success: true, data: workloadSimulator.getStatus() });
});

router.get('/simulation/export-csv', async (req, res) => {
  try {
    const transactions = await db.getRecentTransactions(1000);
    const headers = ['Transaction ID', 'Request ID', 'Product ID', 'Strategy', 'Status', 'Retries', 'Conflict Detected', 'Latency (ms)', 'Timestamp'];
    const rows = transactions.map(t => [
      t.id,
      t.request_id,
      t.product_id,
      t.strategy,
      t.status,
      t.retries,
      t.conflict_detected,
      t.execution_time_ms,
      t.created_at
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ctg-transactions-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Metrics, Telemetry & Adaptive
router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    data: {
      metrics: metricsCollector.getAggregatedMetrics(),
      adaptive: adaptiveController.getStatus(),
      database: db.getDbStatus(),
      comparison: workloadSimulator.comparisonResults || null
    }
  });
});

router.get('/strategy/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const events = await db.getStrategyEvents(limit);
    res.json({ success: true, count: events.length, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/strategy/adaptive', (req, res) => {
  res.json({ success: true, data: adaptiveController.getStatus() });
});

router.post('/strategy/config', (req, res) => {
  const updated = adaptiveController.updateConfig(req.body || {});
  res.json({ success: true, message: 'Adaptive parameters updated', data: updated });
});

// Consistency Audit
router.get('/consistency/report', async (req, res) => {
  try {
    const report = await db.validateConsistency();
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mount router under /api AND root for Vercel Serverless Function versatility
app.use('/api', router);
app.use('/', router);

module.exports = app;
