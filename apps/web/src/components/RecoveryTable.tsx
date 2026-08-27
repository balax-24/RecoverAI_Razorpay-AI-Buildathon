import React from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export interface RecoveryCaseRecord {
  id: string;
  amountAtRisk: number;
  currency: string;
  reasonCode: string;
  priorityScore: number;
  status: string;
  currentStrategy?: string;
  attemptCount: number;
  traceId?: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  payment: {
    id: string;
    razorpayPaymentId: string;
    amount: number;
    currency: string;
    status: string;
    method?: string;
    errorCode?: string;
    errorReason?: string;
  };
  actions?: Array<{
    id: string;
    actionType: string;
    policyDecision: string;
    executionStatus: string;
    providerReference?: string;
    createdAt: string;
  }>;
  approvals?: Array<{
    id: string;
    status: string;
    reasonCode: string;
  }>;
}

interface RecoveryTableProps {
  cases: RecoveryCaseRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  search: string;
  statusFilter: string;
  reasonFilter: string;
  strategyFilter: string;
  sortBy: string;
  sortOrder: string;
  onSearchChange: (val: string) => void;
  onStatusFilterChange: (val: string) => void;
  onReasonFilterChange: (val: string) => void;
  onStrategyFilterChange: (val: string) => void;
  onSortChange: (field: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectCase: (c: RecoveryCaseRecord) => void;
  onRefresh: () => void;
}

function timeAgo(dateString: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (seconds < 30) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecoveryTable({
  cases,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  search,
  statusFilter,
  reasonFilter,
  strategyFilter,
  onSearchChange,
  onStatusFilterChange,
  onReasonFilterChange,
  onStrategyFilterChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onSelectCase,
  onRefresh,
}: RecoveryTableProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-xl">
      {/* Header & Filter Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white tracking-tight">
                Active Recovery Cases
              </h2>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono font-medium text-slate-300 border border-slate-700">
                {total.toLocaleString('en-IN')} total cases
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Live monitoring, deterministic policy enforcement, and autonomous action execution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search customer, payment, trace ID..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="EVALUATING">EVALUATING</option>
              <option value="ACTION_SCHEDULED">ACTION_SCHEDULED</option>
              <option value="ACTION_EXECUTED">ACTION_EXECUTED</option>
              <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
              <option value="RECOVERED">RECOVERED</option>
              <option value="EXHAUSTED">EXHAUSTED</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </div>

          {/* Failure Reason Filter */}
          <div>
            <select
              value={reasonFilter}
              onChange={(e) => onReasonFilterChange(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition cursor-pointer"
            >
              <option value="ALL">All Failure Reasons</option>
              <option value="INSUFFICIENT_FUNDS">Insufficient Funds</option>
              <option value="GATEWAY_TIMEOUT">Gateway Timeout</option>
              <option value="NETWORK_TIMEOUT">Network Timeout</option>
              <option value="CARD_EXPIRED">Expired Card</option>
              <option value="AUTHENTICATION_FAILED">Authentication Failed</option>
            </select>
          </div>

          {/* Strategy Filter */}
          <div>
            <select
              value={strategyFilter}
              onChange={(e) => onStrategyFilterChange(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition cursor-pointer"
            >
              <option value="ALL">All AI Strategies</option>
              <option value="SMART_RETRY">SMART_RETRY</option>
              <option value="PAYMENT_LINK">PAYMENT_LINK</option>
              <option value="INCENTIVE_OFFER">INCENTIVE_OFFER</option>
              <option value="CUSTOMER_MESSAGING">CUSTOMER_MESSAGING</option>
              <option value="MANUAL_INTERVENTION">MANUAL_INTERVENTION</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-400">
            <tr>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Payment ID</th>
              <th
                onClick={() => onSortChange('amountAtRisk')}
                className="py-3 px-4 cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center gap-1.5">
                  Amount
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4">Failure Reason</th>
              <th className="py-3 px-4">AI Strategy</th>
              <th className="py-3 px-4">Policy Check</th>
              <th className="py-3 px-4">Status</th>
              <th
                onClick={() => onSortChange('createdAt')}
                className="py-3 px-4 cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center gap-1.5">
                  Updated
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="mx-auto max-w-sm space-y-2">
                    <p className="text-sm font-medium text-slate-300">No recovery cases found</p>
                    <p className="text-xs text-slate-500">
                      No records match the active filter criteria. Try adjusting your search query or reset filters.
                    </p>
                    <button
                      onClick={() => {
                        onSearchChange('');
                        onStatusFilterChange('ALL');
                        onReasonFilterChange('ALL');
                        onStrategyFilterChange('ALL');
                      }}
                      className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              cases.map((c) => {
                const latestAction = c.actions?.[0];
                const policyDecision =
                  c.status === 'PENDING_APPROVAL'
                    ? 'APPROVAL_REQUIRED'
                    : latestAction?.policyDecision || (c.status === 'RECOVERED' ? 'ALLOW' : 'ALLOW');

                const strategyDisplay =
                  c.currentStrategy || latestAction?.actionType || 'SMART_RETRY';

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className="hover:bg-slate-800/40 cursor-pointer transition group"
                  >
                    {/* Customer */}
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-500/20 font-bold text-xs shrink-0">
                          {c.customer?.name?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 group-hover:text-indigo-300 transition">
                            {c.customer?.name || 'Valued Customer'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                            {c.customer?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Payment ID */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span>{c.payment?.razorpayPaymentId || `pay_${c.id.substring(0, 8)}`}</span>
                        <button
                          onClick={(e) =>
                            copyToClipboard(
                              c.payment?.razorpayPaymentId || `pay_${c.id.substring(0, 8)}`,
                              e
                            )
                          }
                          className="text-slate-500 hover:text-white transition"
                        >
                          {copiedId === (c.payment?.razorpayPaymentId || `pay_${c.id.substring(0, 8)}`) ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      ₹{Number(c.amountAtRisk).toLocaleString('en-IN')}
                    </td>

                    {/* Failure Reason */}
                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-slate-800/80 px-2 py-0.5 font-mono text-[11px] text-slate-300 border border-slate-700">
                        {c.reasonCode?.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* AI Strategy */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-indigo-300 font-mono text-[11px]">
                        <Sparkles className="h-3 w-3 text-purple-400 shrink-0" />
                        <span>{strategyDisplay.replace(/_/g, ' ')}</span>
                      </div>
                    </td>

                    {/* Policy */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={policyDecision} />
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Updated */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {timeAgo(c.updatedAt || c.createdAt)}
                    </td>

                    {/* Details Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold text-slate-300 group-hover:border-indigo-500/40 group-hover:text-white transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            Showing <span className="font-semibold text-white">{startIndex}</span>–
            <span className="font-semibold text-white">{endIndex}</span> of{' '}
            <span className="font-semibold text-white">{total.toLocaleString('en-IN')}</span> cases
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>

          <span className="px-2 font-mono text-xs text-slate-400">
            Page <span className="text-white font-bold">{page}</span> of{' '}
            <span className="text-white font-bold">{totalPages || 1}</span>
          </span>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
