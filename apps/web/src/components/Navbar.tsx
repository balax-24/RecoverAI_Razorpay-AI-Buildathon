'use client';

import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 font-bold text-white shadow-lg shadow-brand-500/20">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">RecoverAI</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Revenue Recovery Platform</p>
          </div>
        </div>

        <nav className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              OWASP ASVS Verified
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Activity className="h-4 w-4 text-brand-400" />
              Orchestrator: Ready
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-300 border border-slate-800">
              Merchant: Acme Stores
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
}
