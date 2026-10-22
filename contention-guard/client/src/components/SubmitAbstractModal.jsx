import React, { useState } from 'react';
import { X, CheckCircle, FileText, Send, AlertCircle } from 'lucide-react';

export default function SubmitAbstractModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [form, setForm] = useState({
    authorName: '',
    email: '',
    institution: '',
    strategyName: '',
    abstractText: '',
    repositoryUrl: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.authorName.trim()) errs.authorName = 'Author name is required.';
    if (!form.email.trim() || !form.email.includes('@')) errs.email = 'Valid institutional email required.';
    if (!form.institution.trim()) errs.institution = 'Institution or organization is required.';
    if (!form.strategyName.trim()) errs.strategyName = 'Strategy / title is required.';
    if (!form.abstractText.trim() || form.abstractText.length < 30) {
      errs.abstractText = 'Abstract must be at least 30 characters.';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    // Simulate API persistence
    setTimeout(() => {
      setSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setForm({
      authorName: '',
      email: '',
      institution: '',
      strategyName: '',
      abstractText: '',
      repositoryUrl: ''
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Submit Research Abstract
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Submit your concurrency control proposal or benchmark replication report to the Research Arena review track.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Author / Lead Researcher <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Dr. Alice Chen"
                    value={form.authorName}
                    onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                    className={`w-full ra-input ${errors.authorName ? 'border-rose-400' : ''}`}
                  />
                  {errors.authorName && (
                    <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.authorName}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="alice@university.edu"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`w-full ra-input ${errors.email ? 'border-rose-400' : ''}`}
                  />
                  {errors.email && (
                    <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.email}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Institution / University <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Stanford University"
                    value={form.institution}
                    onChange={(e) => setForm({ ...form, institution: e.target.value })}
                    className={`w-full ra-input ${errors.institution ? 'border-rose-400' : ''}`}
                  />
                  {errors.institution && (
                    <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.institution}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Strategy / Paper Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Dynamic Jittered Backoff"
                    value={form.strategyName}
                    onChange={(e) => setForm({ ...form, strategyName: e.target.value })}
                    className={`w-full ra-input ${errors.strategyName ? 'border-rose-400' : ''}`}
                  />
                  {errors.strategyName && (
                    <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.strategyName}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Abstract &amp; Methodology Summary <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="Summarize the concurrency mechanism, contention estimation heuristic, and invariant verification methodology..."
                  value={form.abstractText}
                  onChange={(e) => setForm({ ...form, abstractText: e.target.value })}
                  className={`w-full ra-input ${errors.abstractText ? 'border-rose-400' : ''}`}
                />
                {errors.abstractText && (
                  <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.abstractText}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Code Repository / Preprint URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={form.repositoryUrl}
                  onChange={(e) => setForm({ ...form, repositoryUrl: e.target.value })}
                  className="w-full ra-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition disabled:opacity-50 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Abstract'}</span>
                </button>
              </div>

            </form>
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Abstract Submitted Successfully
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              Your submission for &ldquo;{form.strategyName}&rdquo; has been received by the Research Arena program committee. A confirmation email has been logged.
            </p>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
