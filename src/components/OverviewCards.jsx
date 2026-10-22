import React from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

export default function OverviewCards({ metrics, adaptive, consistency }) {
  const m = metrics || {};
  const a = adaptive || {};
  const c = consistency || {};

  const total = m.totalTransactions || 0;
  const success = m.successfulTransactions || 0;
  const aborted = m.abortedTransactions || 0;
  const conflictRate = m.conflictRatePercent || 0;
  const throughput = m.throughputTps || 0;
  const avgLatency = m.avgLatencyMs || 0;
  const p95Latency = m.p95LatencyMs || 0;

  const currentStrategy = a.currentStrategy || 'OCC';
  const contentionScore = a.contentionPercentage || 0;
  const isConsistent = c.isConsistent !== false && (c.violations || []).length === 0;

  return (
    <div className="space-y-4 mb-6">
      
      {/* Primary Invariant & Trust Banner */}
      <div className={`p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isConsistent 
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
      }`}>
        <div className="flex items-center gap-2">
          {isConsistent ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          )}
          <span className="font-semibold">
            {isConsistent 
              ? 'Transaction Invariant Verification: PASSED (0 Consistency Violations)' 
              : `Invariant Violation Detected: ${(c.violations || []).length} errors`}
          </span>
        </div>
        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
          Non-negative stock guaranteed • Exact inventory balance preserved
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="ra-card divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 text-left">
        
        {/* 1. Active Strategy */}
        <div className="p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Active Strategy
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {currentStrategy}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {a.switchCount ? `${a.switchCount} strategy switches` : 'OCC baseline'}
          </div>
        </div>

        {/* 2. Contention Index */}
        <div className="p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Contention Index
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {contentionScore}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Band: {a.thresholds?.lowPercent || 15}% – {a.thresholds?.highPercent || 40}%
          </div>
        </div>

        {/* 3. Throughput */}
        <div className="p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Throughput
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {throughput} <span className="text-xs font-normal text-slate-500">tps</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            {total} total requests
          </div>
        </div>

        {/* 4. Latency Profile */}
        <div className="p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Latency (Avg / p95)
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {avgLatency} <span className="text-xs font-normal text-slate-500">/ {p95Latency} ms</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Round-trip response time
          </div>
        </div>

        {/* 5. Conflict Rate */}
        <div className="p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Conflict Rate
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {conflictRate}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Retries: {m.totalRetries || 0}
          </div>
        </div>

        {/* 6. Commits vs Aborts */}
        <div className="p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Commits / Aborts
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {success} <span className="text-xs font-normal text-slate-400">/ {aborted}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Insufficient stock: {m.insufficientStockCount || 0}
          </div>
        </div>

      </div>

    </div>
  );
}
