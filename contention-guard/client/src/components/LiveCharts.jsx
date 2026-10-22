import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded shadow-md text-xs font-mono">
        <p className="text-slate-500 dark:text-slate-400 mb-1 font-sans font-medium">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
            <span style={{ color: entry.color }} className="flex items-center gap-1.5 font-sans">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function LiveCharts({ timeSeries = [], adaptiveStatus }) {
  const data = timeSeries && timeSeries.length > 0 ? timeSeries : [
    { timeLabel: '00:00:00', tps: 0, avgLatency: 0, p95Latency: 0, conflictRate: 0, contentionScore: 0 }
  ];

  const currentScore = adaptiveStatus?.contentionPercentage || 0;
  const highThreshold = adaptiveStatus?.thresholds?.highPercent || 40;
  const lowThreshold = adaptiveStatus?.thresholds?.lowPercent || 15;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      
      {/* 1. Throughput Over Time */}
      <div className="ra-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Throughput Dynamics (Transactions / Sec)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Real-time processed API requests per second
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
            Current: {data[data.length - 1]?.tps || 0} tps
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
              <XAxis dataKey="timeLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="tps" 
                name="Throughput (tps)" 
                stroke="#2563eb" 
                strokeWidth={1.5}
                fillOpacity={0.15} 
                fill="#2563eb" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Latency Profile (Avg vs P95) */}
      <div className="ra-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Response Time Distribution
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Average latency vs. 95th percentile tail latency
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
            p95: {data[data.length - 1]?.p95Latency || 0} ms
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
              <XAxis dataKey="timeLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit="ms" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Line 
                type="monotone" 
                dataKey="avgLatency" 
                name="Average Latency (ms)" 
                stroke="#0f766e" 
                strokeWidth={1.5}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="p95Latency" 
                name="p95 Tail Latency (ms)" 
                stroke="#6366f1" 
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Conflict Rate & Retries */}
      <div className="ra-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Transaction Conflict Rate (%)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Percentage of write collisions and OCC version retries
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
            {data[data.length - 1]?.conflictRate || 0}%
          </span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
              <XAxis dataKey="timeLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="conflictRate" 
                name="Conflict Rate (%)" 
                stroke="#e11d48" 
                strokeWidth={1.5}
                fillOpacity={0.12} 
                fill="#e11d48" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Adaptive Contention Hysteresis Gauge */}
      <div className="ra-card p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Contention Score &amp; Hysteresis Protocol
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              Score: {currentScore}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            Dual thresholds prevent oscillating strategy switching. Strategy is retained while inside the hysteresis band.
          </p>
        </div>

        {/* Visual Gauge Bar */}
        <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40 my-auto">
          <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-2">
            <span>OCC Region (&lt;{lowThreshold}%)</span>
            <span>Hysteresis Band ({lowThreshold}% – {highThreshold}%)</span>
            <span>PCC Region (&gt;{highThreshold}%)</span>
          </div>

          <div className="relative w-full h-4 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden flex">
            {/* Low zone */}
            <div 
              style={{ width: `${lowThreshold}%` }} 
              className="h-full bg-slate-300 dark:bg-slate-600 border-r border-slate-400 dark:border-slate-500"
            />
            {/* Neutral Hysteresis band */}
            <div 
              style={{ width: `${highThreshold - lowThreshold}%` }} 
              className="h-full bg-slate-100 dark:bg-slate-800 border-r border-slate-400 dark:border-slate-500"
            />
            {/* High zone */}
            <div 
              style={{ width: `${100 - highThreshold}%` }} 
              className="h-full bg-slate-300 dark:bg-slate-600"
            />

            {/* Current marker */}
            <div 
              className="absolute top-0 bottom-0 w-2 bg-slate-900 dark:bg-white shadow transition-all duration-300"
              style={{ left: `${Math.min(99, Math.max(1, currentScore))}%` }}
            />
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <span>Current Strategy: </span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {adaptiveStatus?.currentStrategy || 'OCC'}
              </strong>
            </div>
            <div className="font-mono text-[11px]">
              Window: {adaptiveStatus?.thresholds?.windowSize || 50} tx
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
          {currentScore >= highThreshold 
            ? 'High contention detected: serializing writes via row-level locks (PCC) to prevent OCC retry aborts.'
            : currentScore <= lowThreshold
            ? 'Low contention: non-blocking versioned updates (OCC) prioritized for maximum parallel throughput.'
            : 'Within hysteresis band: maintaining current protocol to preserve routing stability.'}
        </p>
      </div>

    </div>
  );
}
