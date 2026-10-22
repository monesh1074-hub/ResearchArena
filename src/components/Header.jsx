import React from 'react';
import { 
  Database, 
  Cpu, 
  Activity, 
  Sun, 
  Moon, 
  SlidersHorizontal,
  FileText,
  BarChart2,
  List,
  Layers
} from 'lucide-react';

export default function Header({
  dbStatus,
  adaptiveStatus,
  isDarkMode,
  onToggleTheme,
  onOpenSettings,
  onOpenSubmitAbstract,
  activeTab,
  onSelectTab,
  isSimRunning
}) {
  const currentStrategy = adaptiveStatus?.currentStrategy || 'OCC';
  const contentionPercent = adaptiveStatus?.contentionPercentage || 0;
  const isPostgres = dbStatus?.isPostgres;

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top bar with brand & utility actions */}
        <div className="flex items-center justify-between h-16 border-b border-slate-100 dark:border-slate-800/60">
          
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm tracking-tight">
              RA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white text-base tracking-tight">
                  Research Arena
                </span>
                <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  CATG-2026
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Transaction Concurrency &amp; Systems Benchmark Platform
              </p>
            </div>
          </div>

          {/* System Telemetry & Quick Status */}
          <div className="flex items-center gap-2.5">
            
            {/* Database Engine Status */}
            <div 
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${
                isPostgres 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                  : 'bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title={dbStatus?.statusMessage}
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>{isPostgres ? 'PostgreSQL' : 'In-Memory Engine'}</span>
            </div>

            {/* Active Strategy Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentStrategy}</span>
              {adaptiveStatus?.inCooldown && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans font-normal">
                  (cooldown)
                </span>
              )}
            </div>

            {/* Contention Index Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500">Contention:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {contentionPercent}%
              </span>
            </div>

            {/* Simulation Status */}
            {isSimRunning && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Simulating...
              </span>
            )}

            {/* Submit Abstract Action */}
            <button
              onClick={onOpenSubmitAbstract}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Submit Abstract</span>
            </button>

            {/* Adaptive Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Configure Adaptive Controller Thresholds"
              aria-label="Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Toggle Light/Dark Theme"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

          </div>
        </div>

        {/* Section Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-6 pt-1 overflow-x-auto text-xs font-medium">
          {[
            { id: 'arena', label: 'Benchmark Arena', icon: BarChart2 },
            { id: 'challenge', label: 'Challenge Overview', icon: Layers },
            { id: 'ledger', label: 'Transaction Audit Ledger', icon: List }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-2 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
