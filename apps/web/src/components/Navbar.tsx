'use client';

import React from 'react';
import {
  ShieldCheck,
  Activity,
  Layers,
  Sliders,
  Terminal,
  Webhook,
  GitCompare,
  HeartPulse,
  Database,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'approvals'
  | 'policies'
  | 'audit'
  | 'webhooks'
  | 'reconciliation'
  | 'health';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
}

export function Navbar({
  activeTab,
  onSelectTab,
  pendingApprovalsCount,
  isDemoMode,
  onToggleDemoMode,
}: NavbarProps) {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Recoveries', icon: Layers },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: ShieldCheck,
      badge: pendingApprovalsCount,
    },
    { id: 'policies', label: 'Policies', icon: Sliders },
    { id: 'audit', label: 'Audit Trail', icon: Terminal },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'reconciliation', label: 'Reconciliation', icon: GitCompare },
    { id: 'health', label: 'System Health', icon: HeartPulse },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Branding Strip */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 font-extrabold text-white shadow-lg shadow-brand-500/20 text-sm">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">RecoverAI</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
                {isDemoMode && (
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                    <Database className="h-2.5 w-2.5" />
                    SYNTHETIC DEMO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Autonomous Revenue Recovery Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                OWASP ASVS
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <Activity className="h-3.5 w-3.5" />
                Orchestrator: Sub-15ms
              </span>
            </div>

            <button
              onClick={onToggleDemoMode}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              <Database className="h-3 w-3 text-amber-400" />
              {isDemoMode ? 'Demo Mode: ON' : 'Demo Mode: OFF'}
            </button>

            <span className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-mono font-semibold text-slate-200 border border-slate-800">
              Merchant: Acme Stores
            </span>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <nav className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
