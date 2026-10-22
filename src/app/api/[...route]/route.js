import { NextResponse } from 'next/server';

const db = require('../../../lib/database/db');
const { purchaseProduct } = require('../../../lib/services/inventoryService');
const { workloadSimulator } = require('../../../lib/simulator/workloadSimulator');
const { metricsCollector } = require('../../../lib/metrics/metricsCollector');
const { adaptiveController } = require('../../../lib/concurrency/adaptive');


export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const route = (params.route || []).join('/');
  const { searchParams } = new URL(request.url);

  try {
    if (route === 'health') {
      return NextResponse.json({
        status: 'HEALTHY',
        service: 'Contention-Aware Transaction Guard (CTG) - Next.js App',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        database: db.getDbStatus()
      });
    }

    if (route === 'products') {
      const products = await db.getAllProducts();
      return NextResponse.json({ success: true, data: products });
    }

    if (route === 'transactions') {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const strategy = searchParams.get('strategy') || 'ALL';
      const status = searchParams.get('status') || 'ALL';
      const productId = searchParams.get('productId') || 'ALL';

      const data = await db.getRecentTransactions(limit, { strategy, status, productId });
      return NextResponse.json({ success: true, count: data.length, data });
    }

    if (route === 'simulation/status') {
      return NextResponse.json({ success: true, data: workloadSimulator.getStatus() });
    }

    if (route === 'simulation/export-csv') {
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
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="ctg-transactions-${Date.now()}.csv"`
        }
      });
    }

    if (route === 'metrics') {
      const aggregated = metricsCollector.getAggregatedMetrics();
      const adaptive = adaptiveController.getStatus();
      const database = db.getDbStatus();
      const comparison = workloadSimulator.comparisonResults || null;

      return NextResponse.json({
        success: true,
        data: {
          metrics: aggregated,
          adaptive,
          database,
          comparison
        }
      });
    }

    if (route === 'strategy/events') {
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const events = await db.getStrategyEvents(limit);
      return NextResponse.json({ success: true, count: events.length, data: events });
    }

    if (route === 'strategy/adaptive') {
      return NextResponse.json({ success: true, data: adaptiveController.getStatus() });
    }

    if (route === 'consistency/report') {
      const report = await db.validateConsistency();
      return NextResponse.json({ success: true, data: report });
    }

    return NextResponse.json({ success: false, error: `Route not found: GET /api/${route}` }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const route = (params.route || []).join('/');

  try {
    const body = await request.json().catch(() => ({}));

    if (route === 'products') {
      const { id, name, stock } = body;
      if (!id || !name || stock === undefined) {
        return NextResponse.json({ success: false, error: 'id, name, and stock are required' }, { status: 400 });
      }
      const created = await db.createProduct({ id: String(id).trim(), name: String(name).trim(), stock: parseInt(stock, 10) });
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    if (route === 'transactions/purchase') {
      const { productId, quantity = 1, strategy = 'ADAPTIVE', requestId } = body;
      if (!productId) {
        return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
      }
      const result = await purchaseProduct({ productId, quantity: parseInt(quantity, 10), strategy, requestId });
      return NextResponse.json({ success: result.status === 'SUCCESS', data: result }, { status: result.status === 'SUCCESS' ? 200 : 409 });
    }

    if (route === 'simulation/start') {
      const status = await workloadSimulator.startSimulation(body);
      return NextResponse.json({ success: true, message: 'Simulation started', data: status });
    }

    if (route === 'simulation/stop') {
      const status = workloadSimulator.stopSimulation();
      return NextResponse.json({ success: true, message: 'Simulation stopped', data: status });
    }

    if (route === 'simulation/reset') {
      const { initialInventory = 100 } = body;
      workloadSimulator.stopSimulation();
      await db.resetDatabase(parseInt(initialInventory, 10));
      adaptiveController.reset();
      metricsCollector.reset();
      return NextResponse.json({ success: true, message: 'Simulation reset complete' });
    }

    if (route === 'simulation/compare') {
      const comparisonResults = await workloadSimulator.runComparisonBenchmark(body);
      return NextResponse.json({ success: true, message: 'Comparison complete', data: comparisonResults });
    }

    if (route === 'strategy/config') {
      const updated = adaptiveController.updateConfig(body);
      return NextResponse.json({ success: true, message: 'Adaptive config updated', data: updated });
    }

    return NextResponse.json({ success: false, error: `Route not found: POST /api/${route}` }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
