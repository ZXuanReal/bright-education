import type { ReactNode } from 'react';

export type StatTone = 'indigo' | 'violet' | 'emerald' | 'sky' | 'amber';

type StatCardProps = {
  title: string;
  value: string;
  icon: ReactNode;
  tone?: StatTone;
  badge?: string;
  subtitle?: string;
  loading?: boolean;
};

const toneStyles: Record<StatTone, { iconBg: string; iconText: string; accent: string }> = {
  indigo: {
    iconBg: 'bg-[#f0efff] ring-[#ddd6fe]/70',
    iconText: 'text-[#635bdb]',
    accent: 'text-[#5146c8]',
  },
  violet: {
    iconBg: 'bg-violet-50 ring-violet-200/70',
    iconText: 'text-violet-600',
    accent: 'text-violet-700',
  },
  emerald: {
    iconBg: 'bg-emerald-50 ring-emerald-200/70',
    iconText: 'text-[#16a477]',
    accent: 'text-emerald-700',
  },
  sky: {
    iconBg: 'bg-sky-50 ring-sky-200/70',
    iconText: 'text-sky-600',
    accent: 'text-sky-700',
  },
  amber: {
    iconBg: 'bg-amber-50 ring-amber-200/70',
    iconText: 'text-amber-600',
    accent: 'text-amber-700',
  },
};

export function StatCard({
  title,
  value,
  icon,
  tone = 'indigo',
  badge = 'Live',
  subtitle,
  loading = false,
}: StatCardProps) {
  const styles = toneStyles[tone];

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="skeleton-shimmer h-10 w-10 rounded-xl" />
          <div className="skeleton-shimmer h-5 w-14 rounded-full" />
        </div>
        <div className="skeleton-shimmer mt-5 h-8 w-24 rounded-lg" />
        <div className="skeleton-shimmer mt-2 h-4 w-36 rounded-md" />
      </div>
    );
  }

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-[1.03] ${styles.iconBg} ${styles.iconText}`}
          >
            {icon}
          </div>
          <span className="text-[13.5px] font-semibold text-[var(--color-text-secondary)]">
            {title}
          </span>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
          {badge}
        </span>
      </div>

      <div className="mt-4">
        <div className="font-display text-[32px] font-bold leading-none tracking-tight text-[var(--color-text-primary)] tabular-nums">
          {value}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-[var(--color-text-secondary)]">
        <span className="truncate">{subtitle || 'Synced from portal database'}</span>
      </div>
    </article>
  );
}
