import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'indigo' | 'purple' | 'amber' | 'sky' | 'rose';
}

export function KpiCard({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
  variant = 'indigo',
}: KpiCardProps) {
  const variantStyles = {
    emerald: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      glow: 'group-hover:border-emerald-500/40',
    },
    indigo: {
      bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
      badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      glow: 'group-hover:border-indigo-500/40',
    },
    purple: {
      bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      glow: 'group-hover:border-purple-500/40',
    },
    amber: {
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      glow: 'group-hover:border-amber-500/40',
    },
    sky: {
      bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
      badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      glow: 'group-hover:border-sky-500/40',
    },
    rose: {
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      glow: 'group-hover:border-rose-500/40',
    },
  }[variant];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md transition-all duration-200 hover:bg-slate-900/80 ${variantStyles.glow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${variantStyles.bg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-white font-mono">
          {value}
        </div>
        <div className="mt-2 flex items-center justify-between">
          {subtitle && (
            <span className="text-xs text-slate-400 truncate">
              {subtitle}
            </span>
          )}
          {badge && (
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-medium ${variantStyles.badgeBg}`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
