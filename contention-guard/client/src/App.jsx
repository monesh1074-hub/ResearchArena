import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import ChallengeOverview from './components/ChallengeOverview';
import OverviewCards from './components/OverviewCards';
import WorkloadControls from './components/WorkloadControls';
import LiveCharts from './components/LiveCharts';
import ComparisonSection from './components/ComparisonSection';
import TransactionLogs from './components/TransactionLogs';
import StrategyEventsFeed from './components/StrategyEventsFeed';
import AdaptiveConfigModal from './components/AdaptiveConfigModal';
import SubmitAbstractModal from './components/SubmitAbstractModal';
import { api } from './services/api';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('arena'); // 'arena' | 'challenge' | 'ledger'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitAbstractOpen, setIsSubmitAbstractOpen] = useState(false);

  // Core Telemetry & State
  const [dbStatus, setDbStatus] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [adaptiveStatus, setAdaptiveStatus] = useState({});
  const [simStatus, setSimStatus] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [strategyEvents, setStrategyEvents] = useState([]);
  const [consistencyData, setConsistencyData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);

  // UI States
  const [isComparing, setIsComparing] = useState(false);
  const [txFilters, setTxFilters] = useState({
    strategy: 'ALL',
    status: 'ALL',
    productId: 'ALL'
  });

  const isSimRunning = simStatus?.isRunning || false;
  const prevSimRunningRef = useRef(false);

  // Toggle Theme
  const handleToggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Fetch telemetry
  const fetchTelemetry = async () => {
    try {
      const res = await api.getMetrics();
      if (res.data) {
        setMetrics(res.data.metrics || {});
        setAdaptiveStatus(res.data.adaptive || {});
        setDbStatus(res.data.database || {});
        if (res.data.comparison) {
          setComparisonData(res.data.comparison);
        }
      }
    } catch (err) {
      console.warn('Telemetry fetch error:', err.message);
    }
  };

  // Fetch simulation status
  const fetchSimStatus = async () => {
    try {
      const res = await api.getSimulationStatus();
      if (res.data) {
        setSimStatus(res.data);
      }
    } catch (_) { }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const res = await api.getTransactions({
        limit: 100,
        strategy: txFilters.strategy,
        status: txFilters.status,
        productId: txFilters.productId
      });
      if (res.data) {
        setTransactions(res.data);
      }
    } catch (_) { }
  };

  // Fetch strategy events
  const fetchStrategyEvents = async () => {
    try {
      const res = await api.getStrategyEvents({ limit: 40 });
      if (res.data) {
        setStrategyEvents(res.data);
      }
    } catch (_) { }
  };

  // Fetch consistency report
  const fetchConsistency = async () => {
    try {
      const res = await api.getConsistencyReport();
      if (res.data) {
        setConsistencyData(res.data);
      }
    } catch (_) { }
  };

  // Initial Load & Polling Loops
  useEffect(() => {
    fetchTelemetry();
    fetchSimStatus();
    fetchTransactions();
    fetchStrategyEvents();
    fetchConsistency();

    const metricsInterval = setInterval(() => {
      fetchTelemetry();
      fetchSimStatus();
    }, 1000);

    const logsInterval = setInterval(() => {
      fetchTransactions();
      fetchStrategyEvents();
    }, 2000);

    const consistencyInterval = setInterval(() => {
      fetchConsistency();
    }, 5000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(logsInterval);
      clearInterval(consistencyInterval);
    };
  }, [txFilters]);

  // When simulation finishes, refresh consistency audit immediately
  useEffect(() => {
    if (prevSimRunningRef.current && !isSimRunning) {
      fetchConsistency();
      fetchTransactions();
      fetchStrategyEvents();
    }
    prevSimRunningRef.current = isSimRunning;
  }, [isSimRunning]);

  // Actions
  const handleStartSimulation = async (config) => {
    try {
      await api.startSimulation(config);
      await fetchSimStatus();
      await fetchTelemetry();
    } catch (err) {
      alert(`Simulation failed to start: ${err.message}`);
    }
  };

  const handleStopSimulation = async () => {
    try {
      await api.stopSimulation();
      await fetchSimStatus();
    } catch (err) {
      alert(`Simulation failed to stop: ${err.message}`);
    }
  };

  const handleResetSimulation = async (initialStock = 100) => {
    try {
      await api.resetSimulation({ initialInventory: initialStock });
      await fetchTelemetry();
      await fetchSimStatus();
      await fetchTransactions();
      await fetchStrategyEvents();
      await fetchConsistency();
    } catch (err) {
      alert(`Failed to reset: ${err.message}`);
    }
  };

  const handleRunComparison = async (config) => {
    setIsComparing(true);
    try {
      const res = await api.runComparison(config);
      if (res.data) {
        setComparisonData(res.data);
      }
      await fetchTelemetry();
      await fetchTransactions();
      await fetchStrategyEvents();
      await fetchConsistency();
    } catch (err) {
      alert(`Comparison failed: ${err.message}`);
    } finally {
      setIsComparing(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setTxFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* Human-designed academic navigation header */}
      <Header
        dbStatus={dbStatus}
        adaptiveStatus={adaptiveStatus}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSubmitAbstract={() => setIsSubmitAbstractOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isSimRunning={isSimRunning}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Tab 1: Benchmark Arena */}
        {activeTab === 'arena' && (
          <div>
            {/* Top Overview KPI bar */}
            <OverviewCards
              metrics={metrics}
              adaptive={adaptiveStatus}
              consistency={consistencyData}
            />

            {/* Workload Simulation Setup Console */}
            <WorkloadControls
              simStatus={simStatus}
              onStartSimulation={handleStartSimulation}
              onStopSimulation={handleStopSimulation}
              onResetSimulation={handleResetSimulation}
              onRunComparison={handleRunComparison}
              isComparing={isComparing}
            />

            {/* Performance Charts (Throughput, Latency, Conflicts, Hysteresis) */}
            <LiveCharts
              timeSeries={metrics.timeSeries || []}
              adaptiveStatus={adaptiveStatus}
            />

            {/* Comparative Benchmark Results (OCC vs PCC vs Adaptive) */}
            <ComparisonSection
              comparisonData={comparisonData}
              consistencyData={consistencyData}
            />
          </div>
        )}

        {/* Tab 2: Challenge Overview & Academic Specifications */}
        {activeTab === 'challenge' && (
          <ChallengeOverview
            onOpenArena={() => setActiveTab('arena')}
            onOpenSubmitAbstract={() => setIsSubmitAbstractOpen(true)}
          />
        )}

        {/* Tab 3: Transaction Audit Ledger & Transition Feed */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <StrategyEventsFeed
              events={strategyEvents}
            />

            <TransactionLogs
              transactions={transactions}
              onRefresh={fetchTransactions}
              filters={txFilters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Research Arena</span>
            <span>•</span>
            <span>Empirical Systems &amp; Concurrency Benchmark Track</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>PostgreSQL &amp; In-Memory Dual Engine</span>
            <span>•</span>
            <span>Zero-Lost-Updates Invariant Verified</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AdaptiveConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentConfig={adaptiveStatus}
        onSaved={(updated) => setAdaptiveStatus(updated)}
      />

      <SubmitAbstractModal
        isOpen={isSubmitAbstractOpen}
        onClose={() => setIsSubmitAbstractOpen(false)}
      />

    </div>
  );
}
