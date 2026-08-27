import React, { useState } from 'react';
import {
  Terminal,
  Search,
  Copy,
  Check,
} from 'lucide-react';

export interface AuditEventRecord {
  id: string;
  actorType: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  reasonCode?: string;
  traceId?: string;
  timestamp: string;
  metadata?: any;
}

interface AuditViewProps {
  events: AuditEventRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  search: string;
  actorFilter: string;
  onSearchChange: (val: string) => void;
  onActorFilterChange: (val: string) => void;
  onPageChange: (p: number) => void;
}

export function AuditView({
  events,
  total,
  page,
  totalPages,
  isLoading,
  search,
  actorFilter,
  onSearchChange,
  onActorFilterChange,
  onPageChange,
}: AuditViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<AuditEventRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Immutable Security Audit Trail</h2>
              <p className="text-xs text-slate-400">
                Append-only ledger of all automated AI actions, policy evaluations, and human authorizations.
              </p>
            </div>
          </div>

          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-mono text-slate-300 border border-slate-700">
            {total.toLocaleString('en-IN')} logged events
          </span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search action, resource, trace ID..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={actorFilter}
              onChange={(e) => onActorFilterChange(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Actors</option>
              <option value="AI_AGENT">AI_AGENT</option>
              <option value="USER">USER</option>
              <option value="SYSTEM">SYSTEM</option>
              <option value="WEBHOOK">WEBHOOK</option>
              <option value="WORKER">WORKER</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Trace ID</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-sans">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-indigo-300 border border-slate-700">
                        {evt.actorType}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-white font-sans">
                      {evt.action}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {evt.resourceType}: {evt.resourceId.substring(0, 12)}...
                    </td>

                    <td className="py-3 px-4 text-indigo-400">
                      {evt.traceId ? (
                        <div className="flex items-center gap-1">
                          <span>{evt.traceId}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(evt.traceId!);
                            }}
                            className="text-slate-500 hover:text-white"
                          >
                            {copiedId === evt.traceId ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                        }}
                        className="rounded-lg bg-slate-800 px-2.5 py-1 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white transition font-sans"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
          <span>
            Page <span className="text-white font-bold">{page}</span> of{' '}
            <span className="text-white font-bold">{totalPages || 1}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Inspector Dialog */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Audit Event Inspection</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>Action: <span className="text-emerald-400">{selectedEvent.action}</span></div>
              <div>Actor: <span className="text-indigo-300">{selectedEvent.actorType}</span></div>
              <div>Resource: <span className="text-white">{selectedEvent.resourceType} ({selectedEvent.resourceId})</span></div>
              <div>Timestamp: <span className="text-slate-400">{selectedEvent.timestamp}</span></div>
              <div>Trace ID: <span className="text-indigo-400">{selectedEvent.traceId || 'N/A'}</span></div>
            </div>

            {selectedEvent.metadata && (
              <div>
                <span className="text-xs font-bold text-slate-300">Sanitized Metadata:</span>
                <pre className="mt-1.5 rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
                  {JSON.stringify(selectedEvent.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
