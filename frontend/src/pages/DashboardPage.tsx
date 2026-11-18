import {
  BookOpen,
  Download,
  FileText,
  GraduationCap,
  RefreshCw,
  School,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PlatformAnalytics } from '../components/dashboard/PlatformAnalytics';
import { QuickActions } from '../components/dashboard/QuickActions';
import { StatCard, type StatTone } from '../components/StatCard';
import { RecentUploadsTable } from '../components/uploads/RecentUploadsTable';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { DashboardStats } from '../types';

function getErrorMessage(requestError: unknown) {
  const response = (requestError as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message || 'Could not load dashboard statistics.';
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const { data } = await api.get<DashboardStats>('/dashboard');
      setStats(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStats(false);
  }, [loadStats]);

  const totalUsers = stats?.totalUsers ?? 0;
  const pctText = (count: number) =>
    totalUsers > 0 ? `${Math.round((count / totalUsers) * 100)}% of total accounts` : 'Registered accounts';

  const cards: {
    title: string;
    value: number | undefined;
    icon: React.ReactNode;
    tone: StatTone;
    badge: string;
    subtitle: string;
  }[] = [
    {
      title: 'Users',
      value: stats?.totalUsers,
      icon: <Users size={19} strokeWidth={1.9} />,
      tone: 'indigo',
      badge: 'Total',
      subtitle: 'All registered portal accounts',
    },
    {
      title: 'Teachers',
      value: stats?.totalTeachers,
      icon: <GraduationCap size={19} strokeWidth={1.9} />,
      tone: 'emerald',
      badge: 'Approved',
      subtitle: stats ? pctText(stats.totalTeachers) : 'Approved instructors',
    },
    {
      title: 'Students',
      value: stats?.totalStudents,
      icon: <BookOpen size={19} strokeWidth={1.9} />,
      tone: 'sky',
      badge: 'Learners',
      subtitle: stats ? pctText(stats.totalStudents) : 'Active student accounts',
    },
    {
      title: 'Documents',
      value: stats?.totalDocuments,
      icon: <FileText size={19} strokeWidth={1.9} />,
      tone: 'amber',
      badge: 'Library',
      subtitle: 'Active files & lesson videos',
    },
    {
      title: 'Classes',
      value: stats?.totalClasses,
      icon: <School size={19} strokeWidth={1.9} />,
      tone: 'violet',
      badge: 'Academic',
      subtitle: stats
        ? `Across ${stats.totalPrograms.toLocaleString()} active programs`
        : 'Configured portal classes',
    },
    {
      title: 'Downloads',
      value: stats?.totalDownloads,
      icon: <Download size={19} strokeWidth={1.9} />,
      tone: 'emerald',
      badge: 'Activity',
      subtitle: stats
        ? `${stats.totalViews.toLocaleString()} total document views`
        : 'Cumulative file downloads',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Welcome back, <span className="font-medium text-[var(--color-text-primary)]">{user?.fullName || 'User'}</span>.
            Here is the real-time overview of Grow Brighter.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadStats(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-[13px] font-semibold text-[var(--color-text-primary)] shadow-xs transition hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb]"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#635bdb]' : 'text-slate-400'} />
          {refreshing ? 'Refreshing...' : 'Refresh metrics'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadStats(false)}
            className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
          >
            Try again
          </button>
        </div>
      )}

      {/* 6 Statistics Cards */}
      <section aria-label="Platform statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={(stat.value ?? 0).toLocaleString()}
            icon={stat.icon}
            tone={stat.tone}
            badge={stat.badge}
            subtitle={stat.subtitle}
            loading={loading}
          />
        ))}
      </section>

      {/* Quick Actions */}
      <QuickActions />

      {/* Analytics Overview */}
      <PlatformAnalytics stats={stats} loading={loading} />

      {/* Recent Uploads Table */}
      <RecentUploadsTable />
    </div>
  );
}
