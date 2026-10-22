const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const transactionController = require('../controllers/transactionController');
const simulationController = require('../controllers/simulationController');
const metricsController = require('../controllers/metricsController');

// System Health
router.get('/health', metricsController.getHealth);

// Products
router.get('/products', productController.listProducts);
router.post('/products', productController.createProduct);

// Transactions
router.post('/transactions/purchase', transactionController.executePurchase);
router.get('/transactions', transactionController.getRecentTransactions);

// Simulation Controls
router.post('/simulation/start', simulationController.startSimulation);
router.post('/simulation/stop', simulationController.stopSimulation);
router.post('/simulation/reset', simulationController.resetSimulation);
router.post('/simulation/compare', simulationController.runComparison);
router.get('/simulation/status', simulationController.getSimulationStatus);
router.get('/simulation/export-csv', simulationController.exportCsv);

// Telemetry, Metrics & Strategy Events
router.get('/metrics', metricsController.getAggregatedMetrics);
router.get('/strategy/events', metricsController.getStrategyEvents);
router.get('/strategy/adaptive', metricsController.getAdaptiveStatus);
router.post('/strategy/config', metricsController.updateAdaptiveConfig);

// Consistency Audit
router.get('/consistency/report', metricsController.getConsistencyReport);

module.exports = router;
