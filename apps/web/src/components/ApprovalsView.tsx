import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  X,
} from 'lucide-react';

export interface PendingApproval {
  id: string;
  recoveryCaseId: string;
  requestedBy: string;
  requestedAction: string;
  actionPayload: any;
  reasonCode: string;
  status: string;
  createdAt: string;
  recoveryCase: {
    id: string;
    amountAtRisk: number;
    currency: string;
    reasonCode: string;
    priorityScore: number;
    status: string;
    customer: {
      name: string;
      email: string;
    };
    payment: {
      razorpayPaymentId: string;
    };
  };
}

interface ApprovalsViewProps {
  approvals: PendingApproval[];
  isLoading: boolean;
  onApprove: (id: string, notes: string) => Promise<void>;
  onReject: (id: string, notes: string) => Promise<void>;
  onRefresh: () => void;
}

export function ApprovalsView({
  approvals,
  isLoading,
  onApprove,
  onReject,
  onRefresh,
}: ApprovalsViewProps) {
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [reviewNotes, setReviewNotes] = useState('Authorized by Merchant Admin after reviewing risk profile');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedApproval) return;
    setIsSubmitting(true);
    try {
      if (action === 'APPROVE') {
        await onApprove(selectedApproval.id, reviewNotes);
      } else {
        await onReject(selectedApproval.id, reviewNotes);
      }
      setSelectedApproval(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Maker-Checker Dual Authorization Queue
            </h2>
            <p className="text-xs text-slate-300">
              High-value transactions (&gt; ₹10,000) and sensitive recovery actions requiring dual human authorization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-mono font-bold text-amber-400 border border-amber-500/30">
            {approvals.length} Pending Approval
          </span>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Approvals List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Requested Action</th>
                <th className="py-3 px-4">Trigger Reason</th>
                <th className="py-3 px-4">Initiator</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Age</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="mx-auto max-w-sm space-y-2">
                      <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400" />
                      <p className="text-sm font-medium text-white">All approvals resolved</p>
                      <p className="text-xs text-slate-500">
                        No pending dual-authorization requests in the Maker-Checker queue.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                approvals.map((app) => {
                  const amount = Number(app.recoveryCase?.amountAtRisk || 0);
                  const isHighRisk = amount >= 10000;

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => setSelectedApproval(app)}
                    >
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div>
                          <div className="font-semibold text-slate-200">
                            {app.recoveryCase?.customer?.name || 'Customer'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {app.recoveryCase?.customer?.email}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        ₹{amount.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-indigo-950/80 px-2 py-0.5 font-mono text-[11px] text-indigo-300 border border-indigo-500/30">
                          {app.requestedAction}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {app.reasonCode || 'HIGH_VALUE_THRESHOLD_EXCEEDED'}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {app.requestedBy}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border ${
                            isHighRisk
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          }`}
                        >
                          {isHighRisk ? 'HIGH RISK' : 'MEDIUM'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(app.createdAt).toLocaleTimeString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApproval(app);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                        >
                          Review
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal Dialog */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Maker-Checker Authorization Review</h3>
                  <p className="text-xs text-slate-400">
                    Dual human authorization gate for financial action execution
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApproval(null)}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Customer:</span>
                <div className="font-semibold text-white mt-0.5">
                  {selectedApproval.recoveryCase?.customer?.name}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {selectedApproval.recoveryCase?.customer?.email}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">Transaction Amount:</span>
                <div className="font-bold text-base font-mono text-white mt-0.5">
                  ₹{Number(selectedApproval.recoveryCase?.amountAtRisk).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-300">Policy Trigger Reason:</span>
              <p className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
                {selectedApproval.reasonCode === 'HIGH_VALUE_THRESHOLD_EXCEEDED'
                  ? `Transaction amount exceeds the automatic ₹10,000 threshold. In accordance with Maker-Checker policy, an authorized Merchant Administrator must inspect and verify the recovery strategy.`
                  : selectedApproval.reasonCode}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-300">Review Notes / Audit Attestation:</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleAction('REJECT')}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject Action
              </button>
              <button
                onClick={() => handleAction('APPROVE')}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve & Execute Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
