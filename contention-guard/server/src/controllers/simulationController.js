const db = require('../database/db');
const { workloadSimulator } = require('../simulator/workloadSimulator');
const { adaptiveController } = require('../concurrency/adaptive');
const { metricsCollector } = require('../metrics/metricsCollector');

async function startSimulation(req, res, next) {
  try {
    const config = req.body || {};
    const status = await workloadSimulator.startSimulation(config);
    res.json({
      success: true,
      message: 'Workload simulation started successfully',
      data: status
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

async function stopSimulation(req, res, next) {
  try {
    const status = workloadSimulator.stopSimulation();
    res.json({
      success: true,
      message: 'Simulation stop signal dispatched',
      data: status
    });
  } catch (err) {
    next(err);
  }
}

async function resetSimulation(req, res, next) {
  try {
    const { initialInventory = 100 } = req.body || {};
    workloadSimulator.stopSimulation();

    await db.resetDatabase(parseInt(initialInventory, 10));
    adaptiveController.reset();
    metricsCollector.reset();

    res.json({
      success: true,
      message: 'Simulation state, catalog inventory, metrics, and transaction logs reset successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function runComparison(req, res, next) {
  try {
    const config = req.body || {};
    const comparisonResults = await workloadSimulator.runComparisonBenchmark(config);
    res.json({
      success: true,
      message: 'Benchmark comparison across OCC, PCC, and ADAPTIVE completed successfully',
      data: comparisonResults
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

function getSimulationStatus(req, res) {
  res.json({
    success: true,
    data: workloadSimulator.getStatus()
  });
}

function exportCsv(req, res) {
  const csvData = metricsCollector.exportComparisonCSV();
  if (!csvData) {
    return res.status(404).json({
      success: false,
      error: 'No benchmark comparison data available to export. Run a comparison benchmark first.'
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="ctg_benchmark_results.csv"');
  res.status(200).send(csvData);
}

module.exports = {
  startSimulation,
  stopSimulation,
  resetSimulation,
  runComparison,
  getSimulationStatus,
  exportCsv
};
