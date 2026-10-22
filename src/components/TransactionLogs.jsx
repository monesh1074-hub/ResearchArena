import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  RefreshCw,
  List
} from 'lucide-react';

export default function TransactionLogs({ 
  transactions = [], 
  onRefresh, 
  filters, 
  onFilterChange 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredList = transactions.filter(tx => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchId = (tx.id || '').toLowerCase().includes(term);
      const matchReq = (tx.request_id || '').toLowerCase().includes(term);
      const matchProd = (tx.product_id || '').toLowerCase().includes(term);
      if (!matchId && !matchReq && !matchProd) return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="ra-badge bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> SUCCESS
          </span>
        );
      case 'ABORTED':
        return (
          <span className="ra-badge bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3" /> ABORTED
          </span>
        );
      case 'INSUFFICIENT_STOCK':
        return (
          <span className="ra-badge bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-3 h-3" /> OUT_OF_STOCK
          </span>
        );
      default:
        return (
          <span className="ra-badge bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="ra-card p-5 md:p-6 mb-6">
      
      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <List className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>Transaction Audit Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Streaming record of executed API purchase transactions, validation retries, and commit states.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          
          {/* Search Input */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search request ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs ra-input font-mono"
            />
          </div>

          {/* Strategy Filter */}
          <select
            value={filters.strategy}
            onChange={(e) => onFilterChange('strategy', e.target.value)}
            className="text-xs ra-input"
          >
            <option value="ALL">All Strategies</option>
            <option value="OCC">OCC</option>
            <option value="PCC">PCC</option>
            <option value="ADAPTIVE">Adaptive</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="text-xs ra-input"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="ABORTED">Aborted Only</option>
            <option value="INSUFFICIENT_STOCK">Out of Stock</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh Ledger"
            aria-label="Refresh transactions"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-stone-100 dark:bg-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10 backdrop-blur-sm">
            <tr>
              <th className="py-2 px-3">Tx ID</th>
              <th className="py-2 px-3">Request ID</th>
              <th className="py-2 px-3">Product</th>
              <th className="py-2 px-3">Strategy</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Retries</th>
              <th className="py-2 px-3">Conflict</th>
              <th className="py-2 px-3">Latency</th>
              <th className="py-2 px-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-slate-400 font-sans">
                  No transaction records matching current filters.
                </td>
              </tr>
            ) : (
              filteredList.map((tx, idx) => (
                <tr key={tx.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 text-slate-900 dark:text-slate-200 font-medium">
                    {tx.id ? tx.id.slice(-8) : '-'}
                  </td>
                  <td className="py-2 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={tx.request_id}>
                    {tx.request_id || '-'}
                  </td>
                  <td className="py-2 px-3">
                    <span className="ra-badge bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {tx.product_id}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {tx.strategy}
                  </td>
                  <td className="py-2 px-3">
                    {getStatusBadge(tx.status)}
                  </td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                    {tx.retries > 0 ? `${tx.retries}x` : '0'}
                  </td>
                  <td className="py-2 px-3">
                    {tx.conflict_detected ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">Yes</span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                    {tx.execution_time_ms ? `${tx.execution_time_ms.toFixed(1)}ms` : '0ms'}
                  </td>
                  <td className="py-2 px-3 text-slate-500 font-sans text-[10px]">
                    {tx.created_at ? new Date(tx.created_at).toLocaleTimeString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 mt-2.5 px-1">
        <span>Showing {filteredList.length} of {transactions.length} records</span>
        <span className="font-mono text-[11px]">Real-time polling: 2,000 ms</span>
      </div>

    </div>
  );
}
