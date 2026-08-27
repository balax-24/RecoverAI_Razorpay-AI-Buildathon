import React, { useState } from 'react';
import {
  GitCompare,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export interface ReconciliationSummary {
  paymentsChecked: number;
  matched: number;
  mismatches: number;
  resolved: number;
  needsReview: number;
  lastReconciliationAt: string;
}

export interface ReconciliationLog {
  id: string;
  paymentId: string;
  dbStatus: string;
  gatewayStatus: string;
  status: string;
  actionTaken: string;
  reconciledAt: string;
}

interface ReconciliationViewProps {
  summary: ReconciliationSummary;
  logs: ReconciliationLog[];
  isLoading: boolean;
  onResolve: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export function ReconciliationView({
  summary,
  logs,
  isLoading,
  onResolve,
  onRefresh,
}: ReconciliationViewProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleConverge = async (id: string) => {
    setResolvingId(id);
    try {
      await onResolve(id);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <GitCompare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Ledger Reconciliation & State Convergence
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic background sweep comparing local database state against Razorpay gateway truth.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            Last Sweep: 30s ago
          </span>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Run Sweep
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Checked</span>
          <div className="mt-1 text-2xl font-bold font-mono text-white">
            {summary.paymentsChecked.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Matched</span>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-400">
            {summary.matched.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Mismatches</span>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-400">
            {summary.mismatches}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Auto-Resolved</span>
          <div className="mt-1 text-2xl font-bold font-mono text-indigo-400">
            {summary.resolved}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Needs Review</span>
          <div className="mt-1 text-2xl font-bold font-mono text-rose-400">
            {summary.needsReview}
          </div>
        </div>
      </div>

      {/* Discrepancy Log Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 font-bold text-xs text-white">
          Discrepancy Investigation & Convergence
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono text-[11px]">
            <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-400 font-sans">
              <tr>
                <th className="py-3 px-4">Payment ID</th>
                <th className="py-3 px-4">Local State</th>
                <th className="py-3 px-4">Provider State</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Convergence Action</th>
                <th className="py-3 px-4 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="py-3.5 px-4 text-white font-semibold">{log.paymentId}</td>
                  <td className="py-3.5 px-4 text-rose-400">{log.dbStatus}</td>
                  <td className="py-3.5 px-4 text-emerald-400">{log.gatewayStatus}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-300 text-xs truncate max-w-xs">
                    {log.actionTaken}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleConverge(log.id)}
                      disabled={resolvingId === log.id}
                      className="rounded-lg bg-indigo-600 px-3 py-1 font-sans text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                    >
                      {resolvingId === log.id ? 'Converging...' : 'Converge State'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
