import React from 'react';
import { 
  Calendar, 
  Award, 
  FileText, 
  Database, 
  CheckCircle, 
  ArrowRight,
  ExternalLink,
  BookOpen,
  ShieldAlert
} from 'lucide-react';

export default function ChallengeOverview({ onOpenArena, onOpenSubmitAbstract }) {
  return (
    <div className="space-y-6">
      
      {/* Challenge Title Banner */}
      <div className="ra-card p-6 md:p-8">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="ra-badge bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Active Research Challenge
            </span>
            <span className="ra-badge bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Track: Distributed Systems &amp; Database Engineering
            </span>
            <span className="ra-badge bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
              Submissions Open
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
            Adaptive Concurrency Control for High-Contention Web API Transactions
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            Evaluate whether dynamic contention-aware routing between Optimistic Concurrency Control (OCC) and Pessimistic Concurrency Control (PCC) can maximize write throughput and minimize tail latency under variable flash-sale workloads, while formally guaranteeing zero lost updates and non-negative inventory.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenArena}
              className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition shadow-sm"
            >
              <span>Open Benchmark Arena</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenSubmitAbstract}
              className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Submit Abstract</span>
            </button>
          </div>
        </div>
      </div>

      {/* Challenge Specifications & Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Key Information & Deadlines */}
        <div className="ra-card p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Important Dates &amp; Deadlines
          </h2>
          <ul className="space-y-3 text-xs">
            <li className="flex justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Benchmark Opens:</span>
              <span className="font-medium text-slate-900 dark:text-white">October 15, 2026</span>
            </li>
            <li className="flex justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Abstract Submission:</span>
              <span className="font-medium text-slate-900 dark:text-white">November 10, 2026</span>
            </li>
            <li className="flex justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Final Results Due:</span>
              <span className="font-medium text-slate-900 dark:text-white">November 30, 2026</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Review &amp; Leaderboard:</span>
              <span className="font-medium text-slate-900 dark:text-white">December 15, 2026</span>
            </li>
          </ul>
        </div>

        {/* Evaluation Metrics */}
        <div className="ra-card p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Evaluation Criteria
          </h2>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Transaction Throughput:</strong> Committed transactions per second under 50 concurrent workers.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Tail Latency (p95):</strong> Upper response time bound during contention spikes.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Consistency Violations:</strong> Must be exactly <strong>0</strong>. Any overselling or lost update immediately disqualifies a trial.</span>
            </li>
          </ul>
        </div>

        {/* System Baseline Specifications */}
        <div className="ra-card p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Baseline Implementations
          </h2>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <strong className="text-slate-900 dark:text-white block">Baseline A: Optimistic (OCC)</strong>
              Version-checked updates with bounded exponential backoff.
            </li>
            <li className="pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <strong className="text-slate-900 dark:text-white block">Baseline B: Pessimistic (PCC)</strong>
              PostgreSQL row-level exclusive locks via <code>SELECT ... FOR UPDATE</code>.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white block">Proposed: Adaptive Guard</strong>
              Dynamic windowed contention tracking with dual-threshold hysteresis.
            </li>
          </ul>
        </div>

      </div>

      {/* Formal Problem Statement & Invariant Guarantees */}
      <div className="ra-card p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
          Mathematical Consistency Invariants
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
          All submitted strategies are evaluated against five fundamental transaction invariants. No strategy is considered viable if it violates any condition:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-stone-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
            <div className="font-semibold text-slate-900 dark:text-white mb-1">1. Non-Negative Stock</div>
            <p className="text-slate-500 dark:text-slate-400">Inventory count must never drop below 0 under any level of concurrency.</p>
          </div>
          <div className="p-3 bg-stone-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
            <div className="font-semibold text-slate-900 dark:text-white mb-1">2. Exact Stock Balance</div>
            <p className="text-slate-500 dark:text-slate-400">Initial Stock = Current Stock + Total Successful Units Sold.</p>
          </div>
          <div className="p-3 bg-stone-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
            <div className="font-semibold text-slate-900 dark:text-white mb-1">3. Non-Overselling</div>
            <p className="text-slate-500 dark:text-slate-400">Total units committed across all workers cannot exceed initial availability.</p>
          </div>
          <div className="p-3 bg-stone-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
            <div className="font-semibold text-slate-900 dark:text-white mb-1">4. Idempotency Uniqueness</div>
            <p className="text-slate-500 dark:text-slate-400">Duplicate requests with identical idempotency keys execute at most once.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
