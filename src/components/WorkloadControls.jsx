import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Scale, 
  Loader2,
  Sliders
} from 'lucide-react';

export default function WorkloadControls({
  simStatus,
  onStartSimulation,
  onStopSimulation,
  onResetSimulation,
  onRunComparison,
  isComparing
}) {
  const isRunning = simStatus?.isRunning || false;
  const progress = simStatus?.progress || {};

  const [config, setConfig] = useState({
    concurrentClients: 15,
    totalTransactions: 200,
    hotResourcePercentage: 85,
    transactionDelayMs: 5,
    initialInventory: 100,
    workloadProfile: 'high',
    strategy: 'ADAPTIVE'
  });

  const handleChange = (field, val) => {
    setConfig(prev => ({ ...prev, [field]: val }));
  };

  const handleProfileSelect = (profile) => {
    let hotPct = 85;
    if (profile === 'low') hotPct = 20;
    if (profile === 'medium') hotPct = 50;
    if (profile === 'high') hotPct = 90;
    if (profile === 'burst') hotPct = 80;

    setConfig(prev => ({
      ...prev,
      workloadProfile: profile,
      hotResourcePercentage: hotPct
    }));
  };

  const handleStart = () => {
    onStartSimulation(config);
  };

  const handleCompare = () => {
    onRunComparison(config);
  };

  return (
    <div className="ra-card p-5 md:p-6 mb-6">
      
      {/* Controls Header & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>Workload Simulation &amp; Evaluation Setup</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure concurrent clients, request volume, and contention profiles targeting shared inventory.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={isComparing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition shadow-sm disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Simulation</span>
            </button>
          ) : (
            <button
              onClick={onStopSimulation}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          )}

          <button
            onClick={() => onResetSimulation(config.initialInventory)}
            disabled={isRunning || isComparing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition disabled:opacity-50"
            title="Reset Catalog Stock &amp; Clear Telemetry"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Catalog</span>
          </button>

          <button
            onClick={handleCompare}
            disabled={isRunning || isComparing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm disabled:opacity-50"
            title="Run equivalent workloads across OCC, PCC, and Adaptive"
          >
            {isComparing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Scale className="w-3.5 h-3.5" />
            )}
            <span>{isComparing ? 'Benchmarking...' : 'Run 3-Way Comparison'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar (Visible when simulation is running or stopping) */}
      {(isRunning || progress.status === 'RUNNING') && (
        <div className="mb-5 p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700 dark:text-slate-300" />
              Executing: {progress.transactionsCompleted || 0} / {config.totalTransactions} transactions
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {progress.percentComplete || 0}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-slate-900 dark:bg-white transition-all duration-200"
              style={{ width: `${progress.percentComplete || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Workload Profile & Strategy Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
        
        {/* Workload Profile Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Workload Contention Profile
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'low', label: 'Low', desc: 'Distributed writes' },
              { id: 'medium', label: 'Medium', desc: '~50% hot item' },
              { id: 'high', label: 'High', desc: '~90% hot item' },
              { id: 'burst', label: 'Burst', desc: 'Dynamic wave' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                disabled={isRunning || isComparing}
                onClick={() => handleProfileSelect(p.id)}
                className={`p-2.5 rounded text-left border transition ${
                  config.workloadProfile === p.id
                    ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-semibold">{p.label}</div>
                <div className={`text-[10px] truncate ${config.workloadProfile === p.id ? 'opacity-80' : 'text-slate-400'}`}>
                  {p.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Strategy Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Concurrency Strategy
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'OCC', label: 'OCC', desc: 'Optimistic CAS' },
              { id: 'PCC', label: 'PCC', desc: 'Row locking' },
              { id: 'ADAPTIVE', label: 'Adaptive', desc: 'Contention Guard' }
            ].map(s => (
              <button
                key={s.id}
                type="button"
                disabled={isRunning || isComparing}
                onClick={() => handleChange('strategy', s.id)}
                className={`p-2.5 rounded text-left border transition ${
                  config.strategy === s.id
                    ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-semibold">{s.label}</div>
                <div className={`text-[10px] truncate ${config.strategy === s.id ? 'opacity-80' : 'text-slate-400'}`}>
                  {s.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Numerical Sliders & Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Concurrent Clients */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-1.5">
            <span>Concurrent Clients:</span>
            <span className="font-mono font-semibold">{config.concurrentClients}</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={config.concurrentClients}
            disabled={isRunning || isComparing}
            onChange={(e) => handleChange('concurrentClients', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer accent-slate-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>1</span>
            <span>25</span>
            <span>50 workers</span>
          </div>
        </div>

        {/* Total Transactions */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-1.5">
            <span>Total Transactions:</span>
            <span className="font-mono font-semibold">{config.totalTransactions}</span>
          </div>
          <input
            type="range"
            min="20"
            max="1000"
            step="20"
            value={config.totalTransactions}
            disabled={isRunning || isComparing}
            onChange={(e) => handleChange('totalTransactions', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer accent-slate-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>20</span>
            <span>500</span>
            <span>1,000 tx</span>
          </div>
        </div>

        {/* Hot-Resource Concentration */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-1.5">
            <span>Hot Resource Focus:</span>
            <span className="font-mono font-semibold">{config.hotResourcePercentage}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={config.hotResourcePercentage}
            disabled={isRunning || isComparing || config.workloadProfile === 'burst'}
            onChange={(e) => handleChange('hotResourcePercentage', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer accent-slate-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>0% (Spread)</span>
            <span>50%</span>
            <span>100% (Hot)</span>
          </div>
        </div>

        {/* Transaction Delay */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-1.5">
            <span>Network Delay:</span>
            <span className="font-mono font-semibold">{config.transactionDelayMs} ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            value={config.transactionDelayMs}
            disabled={isRunning || isComparing}
            onChange={(e) => handleChange('transactionDelayMs', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer accent-slate-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>0 ms</span>
            <span>25 ms</span>
            <span>50 ms</span>
          </div>
        </div>

      </div>

    </div>
  );
}
