'use client';

import React, { useState } from 'react';
import {
  Play,
  Zap,
  Bomb,
  Server,
  Activity,
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react';

export default function OpsSimulationPage() {
  const [batchCount, setBatchCount] = useState(100);
  const [isSimulating, setIsSimulating] = useState(false);
  const [chaosLog, setChaosLog] = useState<string[]>([
    'System ready for synthetic load injection.',
  ]);

  const runSimulation = () => {
    setIsSimulating(true);
    setChaosLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Generating ${batchCount} synthetic failed payment events...`,
      ...prev,
    ]);

    setTimeout(() => {
      setChaosLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Successfully enqueued ${batchCount} webhooks into BullMQ pipeline.`,
        `[${new Date().toLocaleTimeString()}] Orchestrator evaluating batch with sub-15ms fallback race.`,
        ...prev,
      ]);
      setIsSimulating(false);
    }, 1200);
  };

  const injectChaos = (failureType: string) => {
    setChaosLog((prev) => [
      `[${new Date().toLocaleTimeString()}] [CHAOS] Injected ${failureType} — Verifying circuit breaker & state convergence...`,
      ...prev,
    ]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="border-b border-zinc-800 pb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 font-bold text-white shadow-lg shadow-rose-600/30">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">RecoverAI Ops & Chaos Console</h1>
                <p className="text-xs text-zinc-400">High-throughput synthetic simulation & fault injection</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <Activity className="h-3.5 w-3.5" />
              Cluster Status: NOMINAL
            </span>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Synthetic Batch Generator */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-indigo-400" />
              Synthetic Payment Failure Generator
            </h2>
            <p className="text-xs text-zinc-400">
              Generate concurrent failed Razorpay payment webhooks across diverse failure categories (insufficient funds, timeouts, network slips).
            </p>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-medium text-zinc-300">
                Batch Size: <span className="text-white font-bold">{batchCount} transactions</span>
              </label>
              <input
                type="range"
                min="10"
                max="5000"
                step="50"
                value={batchCount}
                onChange={(e) => setBatchCount(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>

            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {isSimulating ? 'Injecting Batch...' : `Inject ${batchCount} Synthetic Cases`}
            </button>
          </div>

          {/* Chaos Fault Injectors */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bomb className="h-5 w-5 text-rose-400" />
              Chaos Failure Injector
            </h2>
            <p className="text-xs text-zinc-400">
              Trigger intentional platform disruptions to prove circuit breakers, out-of-order webhook reconciliation, and graceful degradation.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => injectChaos('AI Provider 100% Latency Spike')}
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
              >
                <AlertTriangle className="h-4 w-4" />
                Trip AI Timeout
              </button>

              <button
                onClick={() => injectChaos('Duplicate Out-of-Order Webhooks')}
                className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
              >
                <RefreshCcw className="h-4 w-4" />
                Simulate Webhook Race
              </button>

              <button
                onClick={() => injectChaos('Redis Connection Drop')}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
              >
                Drop Queue Worker
              </button>

              <button
                onClick={() => injectChaos('Enable Emergency Safe Mode')}
                className="flex items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
              >
                Toggle Safe Mode
              </button>
            </div>
          </div>
        </div>

        {/* Live Chaos Console Stream */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Live Observability Stream
          </h3>
          <div className="h-64 overflow-y-auto rounded-xl bg-black/60 p-4 font-mono text-xs text-zinc-300 space-y-1.5 border border-zinc-800">
            {chaosLog.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
