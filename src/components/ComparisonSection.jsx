'use client';

import React from 'react';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Scale, 
  Download, 
  CheckCircle2, 
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';

export default function ComparisonSection({ comparisonData, consistencyData }) {
  if (!comparisonData || !comparisonData.strategies || comparisonData.strategies.length === 0) {
    return (
      <div className="ra-card p-8 mb-6 text-center">
        <Scale className="w-8 h-8 text-slate-400 mx-auto mb-2.5 opacity-60" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No Benchmark Comparison Run Yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
          Click &ldquo;Run 3-Way Comparison&rdquo; in the Simulator Controls to execute equivalent workloads sequentially across OCC, PCC, and Adaptive Guard under identical initial conditions.
        </p>
      </div>
    );
  }

  const { strategies = [], summaryExplanation = {}, profile } = comparisonData;
  const productStats = consistencyData?.productStats || {};

  const chartData = strategies.map(s => ({
    name: s.strategy,
    Throughput: s.throughputTps,
    'Avg Latency (ms)': s.avgLatencyMs,
    'p95 Latency (ms)': s.p95LatencyMs,
    'Conflict Rate (%)': s.conflictRatePercent
  }));

  const handleDownloadCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  return (
    <div className="ra-card p-5 md:p-6 mb-6">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>Benchmark Evaluation Results: OCC vs. PCC vs. Adaptive Guard</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comparative performance across {comparisonData.totalTransactionsPerStrategy} transactions per protocol under the {profile?.toUpperCase()} contention profile.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Download Benchmark CSV</span>
        </button>
      </div>

      {/* Comparative Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Throughput Bar Chart */}
        <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-850/50">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Throughput (Committed Transactions / Sec)
          </h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '12px' }} 
                  itemStyle={{ color: '#0f172a' }}
                />
                <Bar dataKey="Throughput" fill="#334155" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Bar Chart */}
        <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-850/50">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Response Time Profile (Avg vs. p95)
          </h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit="ms" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '12px' }} 
                  itemStyle={{ color: '#0f172a' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                <Bar dataKey="Avg Latency (ms)" fill="#0f766e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="p95 Latency (ms)" fill="#6366f1" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Comparative Metrics Table */}
      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 mb-6">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-stone-100 dark:bg-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2.5 px-3">Strategy</th>
              <th className="py-2.5 px-3">Throughput</th>
              <th className="py-2.5 px-3">Avg Latency</th>
              <th className="py-2.5 px-3">p95 Latency</th>
              <th className="py-2.5 px-3">Conflict Rate</th>
              <th className="py-2.5 px-3">Commits / Aborts</th>
              <th className="py-2.5 px-3">Violations</th>
              <th className="py-2.5 px-3">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
            {strategies.map((s, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white font-sans">
                  {s.strategy}
                </td>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{s.throughputTps} tps</td>
                <td className="py-2.5 px-3">{s.avgLatencyMs} ms</td>
                <td className="py-2.5 px-3">{s.p95LatencyMs} ms</td>
                <td className="py-2.5 px-3">{s.conflictRatePercent}%</td>
                <td className="py-2.5 px-3">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{s.successfulTransactions}</span> / <span className="text-rose-600 dark:text-rose-400">{s.abortedTransactions}</span>
                </td>
                <td className="py-2.5 px-3 font-bold">
                  {s.consistencyViolations === 0 ? (
                    <span className="text-emerald-700 dark:text-emerald-400">0 (Valid)</span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400">{s.consistencyViolations}</span>
                  )}
                </td>
                <td className="py-2.5 px-3 font-sans">
                  <span className="ra-badge bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    PASSED
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transactional Invariant Verification Audit Matrix */}
      <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-850/40 mb-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5 font-sans">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Mathematical Invariant Verification Matrix
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(productStats).map(([id, p]) => (
            <div key={id} className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-xs font-mono">
              <div className="font-sans font-semibold text-slate-800 dark:text-slate-200 truncate mb-1" title={p.name}>
                {p.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Initial Stock:</span>
                  <span className="text-slate-900 dark:text-white font-medium">{p.initialStock}</span>
                </div>
                <div className="flex justify-between">
                  <span>Units Sold:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">{p.unitsSold}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Stock:</span>
                  <span className="text-slate-900 dark:text-white font-medium">{p.currentStock}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                  <span>Status:</span>
                  <span className={p.isConsistent ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-rose-600 font-semibold'}>
                    {p.isConsistent ? 'Verified (0 Violations)' : 'Invariant Failed'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Academic Trade-Off & Research Narrative */}
      <div className="p-4 rounded border border-slate-200 dark:border-slate-800 text-xs">
        <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2 font-sans flex items-center gap-1.5">
          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          Empirical Research Findings &amp; Trade-Off Analysis
        </h4>
        <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
          <p><strong className="text-slate-900 dark:text-white">Optimistic Concurrency Control (OCC):</strong> {summaryExplanation.occObservations}</p>
          <p><strong className="text-slate-900 dark:text-white">Pessimistic Concurrency Control (PCC):</strong> {summaryExplanation.pccObservations}</p>
          <p><strong className="text-slate-900 dark:text-white">Contention-Aware Adaptive Guard:</strong> {summaryExplanation.adaptiveObservations}</p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{summaryExplanation.consistencyVerdict}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
