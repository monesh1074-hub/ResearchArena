/**
 * Contention-Aware Adaptive Guard
 * 
 * An intelligent concurrency control routing engine that continuously samples
 * transaction telemetry (conflicts, retries, latency, lock waits) across a sliding window,
 * computes a normalized contention score, and dynamically switches between OCC and PCC.
 * 
 * Key Design Principles:
 * 1. Low Contention: Routes to OCC for non-blocking maximum throughput and minimal overhead.
 * 2. High Contention: Escalates to PCC to serialize hot-resource writes and eliminate OCC retry thrashing.
 * 3. Hysteresis: Dual thresholds (High vs Low) prevent oscillating back and forth.
 * 4. Cooldown Period: Bounded minimum transactions / elapsed time before subsequent switch.
 * 5. Full Observability: Real-time score inspection and audit trail of all strategy transitions.
 */

const db = require('../database/db');
const { executeOCC } = require('./occ');
const { executePCC } = require('./pcc');

class AdaptiveController {
  constructor(options = {}) {
    this.windowSize = options.windowSize || parseInt(process.env.ADAPTIVE_WINDOW_SIZE || '50', 10);
    this.highThreshold = options.highThreshold || parseFloat(process.env.ADAPTIVE_HIGH_THRESHOLD || '0.40');
    this.lowThreshold = options.lowThreshold || parseFloat(process.env.ADAPTIVE_LOW_THRESHOLD || '0.15');
    this.cooldownTransactions = options.cooldownTransactions || parseInt(process.env.ADAPTIVE_COOLDOWN_TRANSACTIONS || '10', 10);
    this.cooldownMs = options.cooldownMs || parseInt(process.env.ADAPTIVE_COOLDOWN_MS || '2000', 10);

    // Baseline latency expectation under zero contention (ms)
    this.baselineLatencyMs = 15;

    // Sliding window of recent transactions
    this.window = [];

    // Per-product contention observation windows
    this.productWindows = new Map();

    // Current global strategy state
    this.currentStrategy = 'OCC';
    this.lastSwitchTime = 0;
    this.transactionsSinceLastSwitch = 0;
    this.switchCount = 0;
    this.lastSwitchReason = 'Initial startup state (Defaulting to OCC)';
    this.latestContentionScore = 0.0;
  }

  /**
   * Record a completed transaction observation into sliding window
   */
  recordObservation(observation) {
    const entry = {
      timestamp: Date.now(),
      productId: observation.productId,
      strategyUsed: observation.strategyUsed,
      status: observation.status,
      conflictDetected: !!observation.conflictDetected,
      retries: observation.retries || 0,
      executionTimeMs: observation.executionTimeMs || 0,
      lockWaitMs: observation.lockWaitMs || 0
    };

    // Global sliding window
    this.window.push(entry);
    if (this.window.length > this.windowSize) {
      this.window.shift();
    }

    // Per-product sliding window
    if (!this.productWindows.has(entry.productId)) {
      this.productWindows.set(entry.productId, []);
    }
    const pWin = this.productWindows.get(entry.productId);
    pWin.push(entry);
    if (pWin.length > this.windowSize) {
      pWin.shift();
    }

    this.transactionsSinceLastSwitch += 1;

    // Recalculate score and evaluate strategy switch
    this.evaluateStrategyTransition();
  }

  /**
   * Calculate normalized contention score [0.0 - 1.0] from a window sample
   */
  calculateContentionScore(sample = this.window) {
    if (sample.length === 0) return 0.0;

    const sampleCount = sample.length;
    let conflicts = 0;
    let totalRetries = 0;
    let totalLatency = 0;
    let totalLockWait = 0;

    for (const item of sample) {
      if (item.conflictDetected || item.status === 'ABORTED' || item.retries > 0) {
        conflicts += 1;
      }
      totalRetries += item.retries;
      totalLatency += item.executionTimeMs;
      totalLockWait += item.lockWaitMs;
    }

    const conflictRate = conflicts / sampleCount; // 0.0 to 1.0
    const avgRetries = totalRetries / sampleCount; // typically 0 to 4
    const avgLatency = totalLatency / sampleCount; // ms
    const avgLockWait = totalLockWait / sampleCount; // ms

    // Normalized factors
    const conflictFactor = conflictRate;
    const retryFactor = Math.min(1.0, avgRetries / 2.0);
    const latencyFactor = Math.min(1.0, Math.max(0, (avgLatency - this.baselineLatencyMs) / (this.baselineLatencyMs * 3.0)));
    const lockWaitFactor = Math.min(1.0, avgLockWait / 80.0);

    // Weighted composite score
    // 45% conflict rate, 25% retry intensity, 15% latency degradation, 15% lock wait delay
    const compositeScore = (
      0.45 * conflictFactor +
      0.25 * retryFactor +
      0.15 * latencyFactor +
      0.15 * lockWaitFactor
    );

    return Math.min(1.0, Math.max(0.0, compositeScore));
  }

  /**
   * Evaluate whether contention warrants a strategy switch (with Hysteresis & Cooldown)
   */
  async evaluateStrategyTransition() {
    if (this.window.length < 5) {
      // Warm-up sample requirement
      return;
    }

    const score = this.calculateContentionScore(this.window);
    this.latestContentionScore = Number(score.toFixed(4));

    const now = Date.now();
    const isCoolingDown = (
      (now - this.lastSwitchTime < this.cooldownMs) ||
      (this.transactionsSinceLastSwitch < this.cooldownTransactions)
    );

    if (isCoolingDown) {
      return;
    }

    // High contention condition -> Escalate to PCC
    if (this.currentStrategy === 'OCC' && score >= this.highThreshold) {
      const prev = this.currentStrategy;
      this.currentStrategy = 'PCC';
      this.lastSwitchTime = now;
      this.transactionsSinceLastSwitch = 0;
      this.switchCount += 1;
      this.lastSwitchReason = `Contention score (${(score * 100).toFixed(1)}%) >= High threshold (${(this.highThreshold * 100).toFixed(1)}%). OCC validation aborts and retry overhead detected. Escalating to PCC to serialize row updates.`;

      console.log(`[AdaptiveGuard] STRATEGY ESCALATION: OCC -> PCC (Score: ${score.toFixed(3)})`);

      await db.recordStrategyEvent({
        previousStrategy: prev,
        newStrategy: this.currentStrategy,
        contentionScore: score,
        reason: this.lastSwitchReason
      }).catch(err => console.error('[AdaptiveGuard] Failed to log event:', err.message));
    }
    // Low contention condition -> Revert to OCC
    else if (this.currentStrategy === 'PCC' && score <= this.lowThreshold) {
      const prev = this.currentStrategy;
      this.currentStrategy = 'OCC';
      this.lastSwitchTime = now;
      this.transactionsSinceLastSwitch = 0;
      this.switchCount += 1;
      this.lastSwitchReason = `Contention score (${(score * 100).toFixed(1)}%) <= Low threshold (${(this.lowThreshold * 100).toFixed(1)}%). Contention subsided. Switching back to OCC for non-blocking parallel execution.`;

      console.log(`[AdaptiveGuard] STRATEGY DE-ESCALATION: PCC -> OCC (Score: ${score.toFixed(3)})`);

      await db.recordStrategyEvent({
        previousStrategy: prev,
        newStrategy: this.currentStrategy,
        contentionScore: score,
        reason: this.lastSwitchReason
      }).catch(err => console.error('[AdaptiveGuard] Failed to log event:', err.message));
    }
  }

  /**
   * Determine strategy for an incoming purchase transaction
   * Can evaluate global strategy or fine-grained per-product contention
   */
  selectStrategyForRequest(productId) {
    // If product has its own hot-spot history, check its dedicated contention score
    if (productId && this.productWindows.has(productId)) {
      const pSample = this.productWindows.get(productId);
      if (pSample.length >= 8) {
        const prodScore = this.calculateContentionScore(pSample);
        if (prodScore >= this.highThreshold) {
          return {
            selectedStrategy: 'PCC',
            effectiveScore: prodScore,
            reason: `Hot resource override: Product ${productId} contention ${(prodScore * 100).toFixed(1)}% >= ${(this.highThreshold * 100).toFixed(1)}%`
          };
        }
      }
    }

    return {
      selectedStrategy: this.currentStrategy,
      effectiveScore: this.latestContentionScore,
      reason: `Global adaptive state: ${this.currentStrategy} (Score: ${(this.latestContentionScore * 100).toFixed(1)}%)`
    };
  }

  /**
   * Execute transaction under the Contention-Aware Adaptive Guard
   */
  async executeAdaptive({ productId, quantity = 1, requestId }) {
    const strategyDecision = this.selectStrategyForRequest(productId);
    const chosenStrategy = strategyDecision.selectedStrategy;

    let txResult;
    if (chosenStrategy === 'PCC') {
      txResult = await executePCC({ productId, quantity, requestId });
    } else {
      txResult = await executeOCC({ productId, quantity, requestId });
    }

    // Tag result with Adaptive metadata
    const enrichedResult = {
      ...txResult,
      adaptiveDecision: {
        routedStrategy: chosenStrategy,
        contentionScore: strategyDecision.effectiveScore,
        decisionReason: strategyDecision.reason,
        switchCount: this.switchCount
      }
    };

    // Feed telemetry back to adaptive engine
    this.recordObservation({
      productId,
      strategyUsed: chosenStrategy,
      status: txResult.status,
      conflictDetected: txResult.conflictDetected,
      retries: txResult.retries,
      executionTimeMs: txResult.executionTimeMs,
      lockWaitMs: txResult.lockWaitMs || 0
    });

    return enrichedResult;
  }

  /**
   * Get real-time controller status for dashboard
   */
  getStatus() {
    const sample = this.window;
    const sampleCount = sample.length;
    let conflicts = 0;
    let retries = 0;
    let totalLatency = 0;
    let totalLockWait = 0;

    for (const s of sample) {
      if (s.conflictDetected || s.status === 'ABORTED' || s.retries > 0) conflicts += 1;
      retries += s.retries;
      totalLatency += s.executionTimeMs;
      totalLockWait += s.lockWaitMs;
    }

    const now = Date.now();
    const timeSinceLastSwitch = Math.max(0, Math.floor((now - this.lastSwitchTime) / 1000));
    const inCooldown = (
      (now - this.lastSwitchTime < this.cooldownMs) ||
      (this.transactionsSinceLastSwitch < this.cooldownTransactions)
    );

    return {
      currentStrategy: this.currentStrategy,
      contentionScore: this.latestContentionScore,
      contentionPercentage: Number((this.latestContentionScore * 100).toFixed(1)),
      switchCount: this.switchCount,
      lastSwitchReason: this.lastSwitchReason,
      lastSwitchSecondsAgo: this.lastSwitchTime === 0 ? null : timeSinceLastSwitch,
      inCooldown,
      transactionsSinceLastSwitch: this.transactionsSinceLastSwitch,
      thresholds: {
        high: this.highThreshold,
        low: this.lowThreshold,
        highPercent: Number((this.highThreshold * 100).toFixed(0)),
        lowPercent: Number((this.lowThreshold * 100).toFixed(0)),
        windowSize: this.windowSize,
        cooldownTransactions: this.cooldownTransactions,
        cooldownMs: this.cooldownMs
      },
      windowMetrics: {
        sampleCount,
        conflictRate: sampleCount > 0 ? Number((conflicts / sampleCount).toFixed(4)) : 0,
        conflictPercent: sampleCount > 0 ? Number(((conflicts / sampleCount) * 100).toFixed(1)) : 0,
        avgRetries: sampleCount > 0 ? Number((retries / sampleCount).toFixed(2)) : 0,
        avgLatencyMs: sampleCount > 0 ? Number((totalLatency / sampleCount).toFixed(2)) : 0,
        avgLockWaitMs: sampleCount > 0 ? Number((totalLockWait / sampleCount).toFixed(2)) : 0
      }
    };
  }

  /**
   * Update controller settings dynamically
   */
  updateConfig(config = {}) {
    if (config.highThreshold !== undefined) this.highThreshold = parseFloat(config.highThreshold);
    if (config.lowThreshold !== undefined) this.lowThreshold = parseFloat(config.lowThreshold);
    if (config.windowSize !== undefined) this.windowSize = parseInt(config.windowSize, 10);
    if (config.cooldownTransactions !== undefined) this.cooldownTransactions = parseInt(config.cooldownTransactions, 10);
    if (config.cooldownMs !== undefined) this.cooldownMs = parseInt(config.cooldownMs, 10);
    return this.getStatus();
  }

  /**
   * Reset adaptive state
   */
  reset() {
    this.window = [];
    this.productWindows.clear();
    this.currentStrategy = 'OCC';
    this.lastSwitchTime = 0;
    this.transactionsSinceLastSwitch = 0;
    this.switchCount = 0;
    this.lastSwitchReason = 'Reset to initial OCC baseline';
    this.latestContentionScore = 0.0;
  }
}

// Singleton adaptive controller instance
const adaptiveController = new AdaptiveController();

module.exports = {
  AdaptiveController,
  adaptiveController
};
