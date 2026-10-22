import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';

export default function StrategyEventsFeed({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="ra-card p-5 mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
          Adaptive Strategy Transition Events
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No strategy switches recorded yet. The Adaptive Guard will record transition events here when workload contention crosses the hysteresis thresholds.
        </p>
      </div>
    );
  }

  return (
    <div className="ra-card p-5 md:p-6 mb-6">
      
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Adaptive Strategy Transition Events
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Real-time audit log of protocol escalation and de-escalation decisions
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {events.length} transitions logged
        </span>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {events.map((ev, idx) => {
          const isEscalation = ev.new_strategy === 'PCC';
          const scorePercent = ((ev.contention_score || 0) * 100).toFixed(1);

          return (
            <div 
              key={ev.id || idx}
              className={`p-3 rounded border text-xs ${
                isEscalation 
                  ? 'bg-stone-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700' 
                  : 'bg-stone-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 font-mono text-[11px]">
                
                {/* Transition Direction */}
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
                    {ev.previous_strategy}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className={`px-1.5 py-0.5 rounded font-semibold ${
                    ev.new_strategy === 'PCC' 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}>
                    {ev.new_strategy}
                  </span>
                </div>

                {/* Score & Timestamp */}
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <span>Score: <strong className="text-slate-900 dark:text-white">{scorePercent}%</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ev.created_at ? new Date(ev.created_at).toLocaleTimeString() : '-'}
                  </span>
                </div>
              </div>

              {/* Rationale */}
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                {ev.reason}
              </p>
            </div>
          );
        })}
      </div>

    </div>
  );
}
