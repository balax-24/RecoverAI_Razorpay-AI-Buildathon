import React from 'react';
import {
  Server,
  Database,
  Layers,
  Brain,
  CreditCard,
  Mail,
  GitCompare,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export interface ServiceHealth {
  name: string;
  status: string;
  latency?: string;
  queueDepth?: number;
  lastCheck: string;
  errorRate?: string;
  mode?: string;
  concurrency?: number;
  fallbackReady?: boolean;
  webhookVerified?: boolean;
}

interface SystemHealthViewProps {
  services?: ServiceHealth[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function SystemHealthView({
  services,
  isLoading,
  onRefresh,
}: SystemHealthViewProps) {
  const defaultServices: ServiceHealth[] = [
    {
      name: 'API Gateway',
      status: 'HEALTHY',
      latency: '2ms',
      lastCheck: '1s ago',
      errorRate: '0.00%',
    },
    {
      name: 'PostgreSQL Database',
      status: 'HEALTHY',
      latency: '3ms',
      lastCheck: '2s ago',
      errorRate: '0.00%',
    },
    {
      name: 'Redis BullMQ Stream',
      status: 'HEALTHY',
      latency: '2ms',
      queueDepth: 0,
      lastCheck: '1s ago',
    },
    {
      name: 'Recovery Worker Cluster',
      status: 'HEALTHY',
      concurrency: 10,
      lastCheck: '3s ago',
      errorRate: '0.01%',
    },
    {
      name: 'AI Decision Engine (Gemini)',
      status: 'HEALTHY',
      latency: '42ms',
      lastCheck: '4s ago',
      fallbackReady: true,
    },
    {
      name: 'Razorpay Gateway Sync',
      status: 'HEALTHY',
      mode: 'Test Mode (rzp_test_*)',
      lastCheck: '2s ago',
      webhookVerified: true,
    },
    {
      name: 'Notification Outbox',
      status: 'HEALTHY',
      latency: '8ms',
      lastCheck: '5s ago',
    },
    {
      name: 'Reconciliation Worker',
      status: 'HEALTHY',
      lastCheck: '12s ago',
    },
  ];

  const list = services && services.length > 0 ? services : defaultServices;

  const getIcon = (name: string) => {
    if (name.includes('Database')) return Database;
    if (name.includes('Redis')) return Layers;
    if (name.includes('AI')) return Brain;
    if (name.includes('Razorpay')) return CreditCard;
    if (name.includes('Notification')) return Mail;
    if (name.includes('Reconciliation')) return GitCompare;
    if (name.includes('Worker')) return Activity;
    return Server;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">System Infrastructure & Health</h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/20">
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live telemetry across microservices, Redis pipelines, AI endpoints, and reconciliation daemons.
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {list.map((svc, idx) => {
          const Icon = getIcon(svc.name);
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 border border-slate-700">
                  <Icon className="h-4 w-4" />
                </div>
                <StatusBadge status={svc.status} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{svc.name}</h3>
                <div className="mt-2 space-y-1 text-xs font-mono text-slate-400">
                  {svc.latency && (
                    <div className="flex justify-between">
                      <span className="font-sans">Latency:</span>
                      <span className="text-emerald-400 font-bold">{svc.latency}</span>
                    </div>
                  )}
                  {svc.queueDepth !== undefined && (
                    <div className="flex justify-between">
                      <span className="font-sans">Queue Depth:</span>
                      <span className="text-white font-bold">{svc.queueDepth}</span>
                    </div>
                  )}
                  {svc.concurrency && (
                    <div className="flex justify-between">
                      <span className="font-sans">Concurrency:</span>
                      <span className="text-white">{svc.concurrency} workers</span>
                    </div>
                  )}
                  {svc.mode && (
                    <div className="flex justify-between">
                      <span className="font-sans">Mode:</span>
                      <span className="text-indigo-300">{svc.mode}</span>
                    </div>
                  )}
                  {svc.fallbackReady && (
                    <div className="flex justify-between">
                      <span className="font-sans">Fallback Engine:</span>
                      <span className="text-emerald-400 font-bold">Ready</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-500">
                    <span className="font-sans">Last Check:</span>
                    <span>{svc.lastCheck}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
