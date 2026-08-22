'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import {
  TrendingUp,
  Clock,
  ShieldAlert,
  Sparkles,
  Sliders,
  DollarSign,
  Zap,
  Lock,
  ChevronRight,
  Database,
} from 'lucide-react';

export default function MerchantDashboard() {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  // Demo stats
  const stats = [
    {
      title: 'Total Recovered Revenue',
      value: isDemoMode ? '₹1,42,850' : '₹0',
      change: '+18.4% this week',
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Active Recovery Cases',
      value: isDemoMode ? '24' : '0',
      change: '14 automated, 10 in grace',
      icon: Clock,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10 border-brand-500/20',
    },
    {
      title: 'AI Strategy Success Rate',
      value: isDemoMode ? '78.2%' : '0%',
      change: 'Single Orchestrator v1',
      icon: Sparkles,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Maker-Checker Pending',
      value: isDemoMode ? '3' : '0',
      change: 'High-value transactions',
      icon: ShieldAlert,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  const mockCases = [
    {
      id: 'rec_case_89a1b2',
      customer: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      amount: '₹14,500.00',
      rawAmount: 14500,
      reason: 'GATEWAY_TIMEOUT',
      status: 'PENDING_APPROVAL',
      strategy: 'INCENTIVE_OFFER (₹100 discount)',
      confidence: '94%',
      time: '12m ago',
      traceId: 'tr_8f2c019a',
      policyReason: 'High-value transaction > ₹10,000 threshold requires Maker-Checker dual authorization',
      timeline: [
        { time: '10:30:12', event: 'Payment failed on Razorpay switch (GATEWAY_TIMEOUT)' },
        { time: '10:30:12', event: 'Sub-25ms webhook ingested & verified via raw buffer HMAC SHA-256' },
        { time: '10:30:13', event: 'AI Single Orchestrator recommended INCENTIVE_OFFER (Confidence: 94%)' },
        { time: '10:30:13', event: 'Policy Engine flagged HIGH_VALUE_THRESHOLD_EXCEEDED; routed to Maker-Checker queue' },
      ],
    },
    {
      id: 'rec_case_77c3d4',
      customer: 'Pooja Verma',
      email: 'pooja.v@example.com',
      amount: '₹3,200.00',
      rawAmount: 3200,
      reason: 'INSUFFICIENT_FUNDS',
      status: 'ACTION_EXECUTED',
      strategy: 'PAYMENT_LINK (Email)',
      confidence: '89%',
      time: '45m ago',
      traceId: 'tr_77d4021b',
      policyReason: 'Conforms to default policy limits',
      timeline: [
        { time: '09:45:00', event: 'Payment failed (INSUFFICIENT_FUNDS)' },
        { time: '09:45:01', event: 'AI Orchestrator evaluated context & generated Payment Link recommendation' },
        { time: '09:45:01', event: 'Policy Engine approved action (ALLOW)' },
        { time: '09:45:02', event: 'Dispatched payment recovery link via transactional outbox to pooja.v@example.com' },
      ],
    },
    {
      id: 'rec_case_65e5f6',
      customer: 'Ananya Patel',
      email: 'ananya.p@example.com',
      amount: '₹8,990.00',
      rawAmount: 8990,
      reason: 'NETWORK_TIMEOUT',
      status: 'RECOVERED',
      strategy: 'SMART_RETRY',
      confidence: '96%',
      time: '2h ago',
      traceId: 'tr_65e5f600',
      policyReason: 'Recovered via automated smart retry',
      timeline: [
        { time: '08:15:00', event: 'Payment failed (NETWORK_TIMEOUT)' },
        { time: '08:15:01', event: 'AI scheduled Smart Retry with 1h delay' },
        { time: '09:15:00', event: 'Smart retry executed successfully; payment captured' },
        { time: '09:15:01', event: 'Recovery case resolved as RECOVERED' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-500">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Top Header & Demo Toggle */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Recovery Operations Center
              </h1>
              {isDemoMode && (
                <span className="rounded-full bg-indigo-500/10 px-3 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Synthetic Demo Data Active
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Deterministic policy enforcement, AI strategy recommendations, and Razorpay webhook convergence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 border border-slate-800 hover:bg-slate-800 transition"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              {isDemoMode ? 'Switch to Live Feed' : 'Load Synthetic Demo'}
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-500/25 hover:opacity-95 transition">
              <Sliders className="h-3.5 w-3.5" />
              Policy Rules DSL
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md transition hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {stat.title}
                  </span>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold tracking-tight text-white">
                    {stat.value}
                  </div>
                  <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    {stat.change}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recovery Stream & Detailed Inspection Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Table */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Active Payment Failure Stream</h2>
              <span className="text-xs text-slate-400 font-mono">Real-Time Ingestion: Active</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Customer / Case</th>
                    <th className="px-6 py-3 font-semibold">Amount</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {mockCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className={`cursor-pointer transition ${
                        selectedCase?.id === c.id ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{c.customer}</div>
                        <div className="text-xs text-slate-400 font-mono">{c.id}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-white font-mono">{c.amount}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                            c.status === 'RECOVERED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : c.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="h-4 w-4 text-slate-400 inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recovery Detail Drawer */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 space-y-6">
            {selectedCase ? (
              <>
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-mono text-brand-400">{selectedCase.id}</span>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedCase.customer}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-extrabold text-white font-mono">{selectedCase.amount}</span>
                    <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-mono text-rose-400 border border-rose-500/20">
                      {selectedCase.reason}
                    </span>
                  </div>
                </div>

                {/* AI & Policy Recommendation */}
                <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                      AI Recommended Strategy
                    </span>
                    <span>Confidence: {selectedCase.confidence}</span>
                  </div>
                  <div className="text-sm font-semibold text-white">{selectedCase.strategy}</div>
                  <p className="text-xs text-slate-400">{selectedCase.policyReason}</p>
                </div>

                {/* Audit & Invariant Timeline */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Immutable Audit Timeline
                  </h4>
                  <div className="space-y-3 border-l-2 border-slate-800 pl-4 text-xs font-mono">
                    {selectedCase.timeline.map((step: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
                        <span className="text-slate-500">{step.time}</span>
                        <div className="text-slate-200 mt-0.5">{step.event}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-500 font-mono flex items-center justify-between">
                  <span>Trace: {selectedCase.traceId}</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> W3C Verified
                  </span>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                <Clock className="h-8 w-8 text-slate-600" />
                <p className="text-sm">Select a recovery case to inspect AI decisions, policy evaluations, and audit timelines.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
