import React, { useState } from 'react';
import { X, Sliders, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function AdaptiveConfigModal({ isOpen, onClose, currentConfig, onSaved }) {
  if (!isOpen) return null;

  const thresholds = currentConfig?.thresholds || {};

  const [form, setForm] = useState({
    highThreshold: thresholds.high || 0.40,
    lowThreshold: thresholds.low || 0.15,
    windowSize: thresholds.windowSize || 50,
    cooldownTransactions: thresholds.cooldownTransactions || 10
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    try {
      const res = await api.updateAdaptiveConfig(form);
      setSuccessMsg('Parameters updated successfully');
      if (onSaved) onSaved(res.data);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 900);
    } catch (err) {
      alert(`Error updating configuration: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Adaptive Guard Parameters
          </h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          Configure moving-window hysteresis bounds that govern strategy transitions between OCC and PCC.
        </p>

        {successMsg && (
          <div className="mb-4 p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span>High Contention Threshold (Trigger PCC)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {(form.highThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.20"
              max="0.80"
              step="0.05"
              value={form.highThreshold}
              onChange={(e) => setForm(f => ({ ...f, highThreshold: parseFloat(e.target.value) }))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer accent-slate-900 dark:accent-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Switches to PCC when the moving contention score reaches or exceeds this level.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span>Low Contention Threshold (Revert to OCC)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {(form.lowThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.30"
              step="0.05"
              value={form.lowThreshold}
              onChange={(e) => setForm(f => ({ ...f, lowThreshold: parseFloat(e.target.value) }))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer accent-slate-900 dark:accent-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Reverts back to OCC when contention drops below this level.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sliding Window Size
              </label>
              <input
                type="number"
                min="10"
                max="200"
                value={form.windowSize}
                onChange={(e) => setForm(f => ({ ...f, windowSize: parseInt(e.target.value, 10) }))}
                className="w-full text-xs font-mono ra-input"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Recent samples evaluated</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cooldown (Transactions)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.cooldownTransactions}
                onChange={(e) => setForm(f => ({ ...f, cooldownTransactions: parseInt(e.target.value, 10) }))}
                className="w-full text-xs font-mono ra-input"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Min tx between switches</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition shadow-sm"
            >
              {isSaving ? 'Saving...' : 'Apply Parameters'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
