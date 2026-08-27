import React from 'react';
import {
  AlertCircle,
  Brain,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

interface PipelineCounts {
  failed?: number;
  analyzing?: number;
  policyCheck?: number;
  actionRunning?: number;
  recovered?: number;
  escalated?: number;
}

interface PipelineStageBarProps {
  counts: PipelineCounts;
  activeFilter: string;
  onSelectFilter: (status: string) => void;
}

export function PipelineStageBar({
  counts,
  activeFilter,
  onSelectFilter,
}: PipelineStageBarProps) {
  const stages = [
    {
      id: 'PENDING',
      label: 'FAILED',
      count: counts.failed ?? 0,
      icon: AlertCircle,
      color: 'text-rose-400',
      activeBorder: 'border-rose-500 bg-rose-500/10 text-rose-300',
      badge: 'bg-rose-500/20 text-rose-300',
    },
    {
      id: 'EVALUATING',
      label: 'ANALYZING',
      count: counts.analyzing ?? 0,
      icon: Brain,
      color: 'text-purple-400',
      activeBorder: 'border-purple-500 bg-purple-500/10 text-purple-300',
      badge: 'bg-purple-500/20 text-purple-300',
    },
    {
      id: 'PENDING_APPROVAL',
      label: 'POLICY CHECK',
      count: counts.policyCheck ?? 0,
      icon: ShieldCheck,
      color: 'text-amber-400',
      activeBorder: 'border-amber-500 bg-amber-500/10 text-amber-300',
      badge: 'bg-amber-500/20 text-amber-300',
    },
    {
      id: 'ACTION_EXECUTED',
      label: 'ACTION RUNNING',
      count: counts.actionRunning ?? 0,
      icon: Zap,
      color: 'text-sky-400',
      activeBorder: 'border-sky-500 bg-sky-500/10 text-sky-300',
      badge: 'bg-sky-500/20 text-sky-300',
    },
    {
      id: 'RECOVERED',
      label: 'RECOVERED',
      count: counts.recovered ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      activeBorder: 'border-emerald-500 bg-emerald-500/10 text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-300',
    },
    {
      id: 'EXHAUSTED',
      label: 'ESCALATED',
      count: counts.escalated ?? 0,
      icon: AlertTriangle,
      color: 'text-zinc-400',
      activeBorder: 'border-zinc-500 bg-zinc-500/10 text-zinc-300',
      badge: 'bg-zinc-500/20 text-zinc-300',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-md">
      <div className="flex items-center justify-between px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <span>Live Recovery Pipeline</span>
        <button
          onClick={() => onSelectFilter('ALL')}
          className={`text-xs font-mono font-medium hover:text-white transition ${
            activeFilter === 'ALL' ? 'text-indigo-400 underline underline-offset-4' : 'text-slate-400'
          }`}
        >
          View All Stages
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isSelected = activeFilter === stage.id;

          return (
            <button
              key={stage.id}
              onClick={() => onSelectFilter(isSelected ? 'ALL' : stage.id)}
              className={`flex items-center justify-between rounded-xl border p-2.5 transition text-left ${
                isSelected
                  ? stage.activeBorder
                  : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-950/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                  <Icon className={`h-3.5 w-3.5 ${stage.color}`} />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {stage.label}
                  </div>
                  <div className="text-sm font-bold font-mono text-white">
                    {stage.count.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              {idx < stages.length - 1 && (
                <ChevronRight className="hidden lg:block h-3.5 w-3.5 text-slate-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
