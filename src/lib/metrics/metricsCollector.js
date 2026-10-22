/**
 * Real-Time Telemetry & Metrics Collector
 * 
 * Aggregates live transaction streams into:
 * - Summary KPIs (Total, Success, Aborts, Conflict Rate, Retry Rate)
 * - Throughput in transactions per second (tps)
 * - Exact percentiles (p50, p90, p95, p99 latency)
 * - Granular time-series rolling buckets (for live Recharts curves)
 * - Benchmark comparison results store
 * - CSV export generation
 */

class MetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalTransactions = 0;
    this.successfulTransactions = 0;
    this.abortedTransactions = 0;
    this.insufficientStockCount = 0;
    this.conflictsCount = 0;
    this.totalRetries = 0;
    this.totalExecutionTimeMs = 0;
    this.latencies = [];

    this.startTime = Date.now();
    this.timeSeriesBuckets = []; // { timestamp, timeLabel, tps, avgLatency, p95Latency, conflictRate, contentionScore }
    this.currentSecondWindow = {
      secondTs: Math.floor(Date.now() / 1000),
      count: 0,
      successCount: 0,
      conflictCount: 0,
      retryCount: 0,
      latencies: [],
      contentionScore: 0
    };

    // Stored comparisons for OCC vs PCC vs Adaptive
    this.comparisonResults = null;
  }

  recordTransactionMetrics({
    status,
    conflictDetected,
    retries = 0,
    executionTimeMs = 0,
    contentionScore = 0
  }) {
    this.totalTransactions += 1;
    this.latencies.push(executionTimeMs);
    this.totalExecutionTimeMs += executionTimeMs;
    this.totalRetries += retries;

    if (status === 'SUCCESS') {
      this.successfulTransactions += 1;
    } else if (status === 'INSUFFICIENT_STOCK') {
      this.insufficientStockCount += 1;
    } else {
      this.abortedTransactions += 1;
    }

    if (conflictDetected) {
      this.conflictsCount += 1;
    }

    // Time-series bucketing by second
    const currentSec = Math.floor(Date.now() / 1000);
    if (currentSec !== this.currentSecondWindow.secondTs) {
      this.flushSecondBucket();
      this.currentSecondWindow = {
        secondTs: currentSec,
        count: 0,
        successCount: 0,
        conflictCount: 0,
        retryCount: 0,
        latencies: [],
        contentionScore
      };
    }

    this.currentSecondWindow.count += 1;
    if (status === 'SUCCESS') this.currentSecondWindow.successCount += 1;
    if (conflictDetected) this.currentSecondWindow.conflictCount += 1;
    this.currentSecondWindow.retryCount += retries;
    this.currentSecondWindow.latencies.push(executionTimeMs);
    this.currentSecondWindow.contentionScore = contentionScore;
  }

  flushSecondBucket() {
    const bucket = this.currentSecondWindow;
    if (bucket.count === 0 && this.timeSeriesBuckets.length === 0) return;

    const latencies = bucket.latencies.sort((a, b) => a - b);
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((sum, v) => sum + v, 0) / latencies.length 
      : 0;
    const p95Latency = latencies.length > 0
      ? latencies[Math.floor(latencies.length * 0.95)]
      : avgLatency;

    const timeLabel = new Date(bucket.secondTs * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.timeSeriesBuckets.push({
      timestamp: bucket.secondTs * 1000,
      timeLabel,
      tps: bucket.count,
      successTps: bucket.successCount,
      avgLatency: Number(avgLatency.toFixed(1)),
      p95Latency: Number(p95Latency.toFixed(1)),
      conflictRate: bucket.count > 0 ? Number(((bucket.conflictCount / bucket.count) * 100).toFixed(1)) : 0,
      contentionScore: Number((bucket.contentionScore * 100).toFixed(1))
    });

    // Keep up to 60 buckets for smooth visualization
    if (this.timeSeriesBuckets.length > 60) {
      this.timeSeriesBuckets.shift();
    }
  }

  calculatePercentile(percentile) {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.floor((percentile / 100) * sorted.length)
    );
    return sorted[index];
  }

  getMetricsSummary() {
    this.flushSecondBucket();

    const elapsedSeconds = Math.max(0.1, (Date.now() - this.startTime) / 1000);
    const tps = Number((this.totalTransactions / elapsedSeconds).toFixed(2));
    const avgLatency = this.totalTransactions > 0 
      ? Number((this.totalExecutionTimeMs / this.totalTransactions).toFixed(2)) 
      : 0;
    
    const conflictRate = this.totalTransactions > 0 
      ? Number(((this.conflictsCount / this.totalTransactions) * 100).toFixed(2)) 
      : 0;

    const retryRate = this.totalTransactions > 0
      ? Number(((this.totalRetries / this.totalTransactions) * 100).toFixed(2))
      : 0;

    return {
      totalTransactions: this.totalTransactions,
      successfulTransactions: this.successfulTransactions,
      abortedTransactions: this.abortedTransactions,
      insufficientStockCount: this.insufficientStockCount,
      conflictsCount: this.conflictsCount,
      totalRetries: this.totalRetries,
      conflictRatePercent: conflictRate,
      retryRatePercent: retryRate,
      throughputTps: tps,
      avgLatencyMs: avgLatency,
      p50LatencyMs: this.calculatePercentile(50),
      p90LatencyMs: this.calculatePercentile(90),
      p95LatencyMs: this.calculatePercentile(95),
      p99LatencyMs: this.calculatePercentile(99),
      elapsedSeconds: Number(elapsedSeconds.toFixed(1)),
      timeSeries: [...this.timeSeriesBuckets]
    };
  }

  getAggregatedMetrics() {
    return this.getMetricsSummary();
  }


  saveComparisonResults(results) {
    this.comparisonResults = {
      ...results,
      completedAt: new Date().toISOString()
    };
  }

  getComparisonResults() {
    return this.comparisonResults;
  }

  exportComparisonCSV() {
    if (!this.comparisonResults || !this.comparisonResults.strategies) {
      return null;
    }

    const headers = [
      'Strategy',
      'WorkloadProfile',
      'TotalTransactions',
      'SuccessfulTransactions',
      'AbortedTransactions',
      'InsufficientStock',
      'ThroughputTps',
      'AvgLatencyMs',
      'P95LatencyMs',
      'ConflictRatePercent',
      'RetryRatePercent',
      'ConsistencyViolations',
      'DurationSeconds'
    ];

    const rows = this.comparisonResults.strategies.map(s => [
      s.strategy,
      this.comparisonResults.profile || 'CUSTOM',
      s.totalTransactions,
      s.successfulTransactions,
      s.abortedTransactions,
      s.insufficientStockCount,
      s.throughputTps,
      s.avgLatencyMs,
      s.p95LatencyMs,
      s.conflictRatePercent,
      s.retryRatePercent,
      s.consistencyViolations || 0,
      s.durationSeconds
    ]);

    return [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
  }
}

const metricsCollector = new MetricsCollector();

module.exports = {
  MetricsCollector,
  metricsCollector
};
