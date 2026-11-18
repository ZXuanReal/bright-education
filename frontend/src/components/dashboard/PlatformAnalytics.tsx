import { BarChart3, Eye, Layers, ShieldCheck } from 'lucide-react';
import type { DashboardStats } from '../../types';

type PlatformAnalyticsProps = {
  stats: DashboardStats | null;
  loading: boolean;
};

export function PlatformAnalytics({ stats, loading }: PlatformAnalyticsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="skeleton-shimmer h-5 w-44 rounded-md" />
          <div className="skeleton-shimmer mt-5 h-4 w-full rounded-full" />
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="skeleton-shimmer h-14 rounded-xl" />
            <div className="skeleton-shimmer h-14 rounded-xl" />
            <div className="skeleton-shimmer h-14 rounded-xl" />
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="skeleton-shimmer h-5 w-44 rounded-md" />
          <div className="mt-5 space-y-3">
            <div className="skeleton-shimmer h-10 rounded-xl" />
            <div className="skeleton-shimmer h-10 rounded-xl" />
            <div className="skeleton-shimmer h-10 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const totalUsers = Math.max(stats.totalUsers, 0);
  const teachers = Math.max(stats.totalTeachers, 0);
  const students = Math.max(stats.totalStudents, 0);
  const admins = Math.max(totalUsers - teachers - students, 0);

  const pct = (part: number, whole: number) =>
    whole > 0 ? Math.round((part / whole) * 100) : 0;

  const studentPct = pct(students, totalUsers);
  const teacherPct = pct(teachers, totalUsers);
  const adminPct = Math.max(0, 100 - studentPct - teacherPct);

  const avgViewsPerDoc =
    stats.totalDocuments > 0 ? (stats.totalViews / stats.totalDocuments).toFixed(1) : '0';
  const avgDownloadsPerDoc =
    stats.totalDocuments > 0 ? (stats.totalDownloads / stats.totalDocuments).toFixed(1) : '0';
  const downloadRate =
    stats.totalViews > 0 ? Math.min(100, Math.round((stats.totalDownloads / stats.totalViews) * 100)) : 0;

  return (
    <section aria-label="Platform analytics" className="grid gap-4 lg:grid-cols-2">
      {/* Account Composition */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
              Account Composition
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Real-time role distribution across {totalUsers.toLocaleString()} registered accounts
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0efff] text-[#635bdb]">
            <ShieldCheck size={16} />
          </div>
        </div>

        {/* Segmented Progress Bar */}
        <div className="mt-5">
          {totalUsers > 0 ? (
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="User role distribution bar">
              {students > 0 && (
                <div
                  style={{ width: `${studentPct}%` }}
                  className="bg-sky-500 transition-all duration-300"
                  title={`Students: ${students} (${studentPct}%)`}
                />
              )}
              {teachers > 0 && (
                <div
                  style={{ width: `${teacherPct}%` }}
                  className="bg-[#16a477] transition-all duration-300"
                  title={`Teachers: ${teachers} (${teacherPct}%)`}
                />
              )}
              {admins > 0 && (
                <div
                  style={{ width: `${adminPct}%` }}
                  className="bg-[#635bdb] transition-all duration-300"
                  title={`Admins: ${admins} (${adminPct}%)`}
                />
              )}
            </div>
          ) : (
            <div className="h-3 w-full rounded-full bg-slate-100" />
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[#f7f8fc]/70 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Students
            </div>
            <div className="mt-1.5 font-display text-xl font-bold text-[var(--color-text-primary)] tabular-nums">
              {students.toLocaleString()}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">{studentPct}% of users</div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[#f7f8fc]/70 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[#16a477]" />
              Teachers
            </div>
            <div className="mt-1.5 font-display text-xl font-bold text-[var(--color-text-primary)] tabular-nums">
              {teachers.toLocaleString()}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">{teacherPct}% of users</div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[#f7f8fc]/70 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[#635bdb]" />
              Admins
            </div>
            <div className="mt-1.5 font-display text-xl font-bold text-[var(--color-text-primary)] tabular-nums">
              {admins.toLocaleString()}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">{adminPct}% of users</div>
          </div>
        </div>
      </div>

      {/* Content & Engagement Summary */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
              Content &amp; Engagement
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Aggregated activity across {stats.totalDocuments.toLocaleString()} active documents
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#16a477]">
            <BarChart3 size={16} />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[#f7f8fc]/70 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <Eye size={16} className="text-[#635bdb]" />
              <div>
                <div className="text-[13px] font-medium text-[var(--color-text-primary)]">Total Document Views</div>
                <div className="text-[11px] text-[var(--color-text-secondary)]">
                  Avg {avgViewsPerDoc} views per document
                </div>
              </div>
            </div>
            <span className="font-display text-lg font-bold text-[var(--color-text-primary)] tabular-nums">
              {stats.totalViews.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[#f7f8fc]/70 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <Layers size={16} className="text-amber-600" />
              <div>
                <div className="text-[13px] font-medium text-[var(--color-text-primary)]">Programs &amp; Classes</div>
                <div className="text-[11px] text-[var(--color-text-secondary)]">
                  {stats.totalPrograms.toLocaleString()} active learning programs
                </div>
              </div>
            </div>
            <span className="font-display text-lg font-bold text-[var(--color-text-primary)] tabular-nums">
              {stats.totalClasses.toLocaleString()} classes
            </span>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[#f7f8fc]/70 px-3.5 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--color-text-primary)]">
                Download-to-View Ratio ({avgDownloadsPerDoc} downloads/doc)
              </span>
              <span className="font-semibold text-[#635bdb] tabular-nums">{downloadRate}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                style={{ width: `${downloadRate}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#635bdb] to-[#16a477] transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
