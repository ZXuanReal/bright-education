import { ArrowRight, ClipboardList, FolderOpen, Trophy, Upload, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function QuickActions() {
  const { user } = useAuth();
  const canAuthor = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';

  const actions = [
    ...(canAuthor
      ? [
          {
            to: '/documents?upload=1',
            title: 'Upload File / Video',
            subtitle: 'Add learning material',
            icon: Upload,
            primary: true,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            to: '/users',
            title: 'Manage Users & Roles',
            subtitle: 'Grant Teacher or lock accounts',
            icon: Users,
            primary: false,
          },
        ]
      : []),
    {
      to: '/documents',
      title: 'Browse Documents',
      subtitle: 'Explore folders & resources',
      icon: FolderOpen,
      primary: false,
    },
    {
      to: '/exercises',
      title: 'Exercises',
      subtitle: 'Practice & assignments',
      icon: ClipboardList,
      primary: false,
    },
    {
      to: '/leaderboard',
      title: 'Leaderboard',
      subtitle: 'View top learners',
      icon: Trophy,
      primary: false,
    },
  ];

  return (
    <section aria-label="Quick actions" className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
            Quick Actions
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            Common shortcuts for your {user?.role ?? 'PORTAL'} workspace
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.slice(0, 4).map(({ to, title, subtitle, icon: Icon, primary }) => (
          <Link
            key={to + title}
            to={to}
            className={`group flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb] ${
              primary
                ? 'border-[#635bdb]/20 bg-gradient-to-br from-[#635bdb] to-[#7c3aed] text-white shadow-sm shadow-indigo-500/20 hover:brightness-105'
                : 'border-[var(--color-border)] bg-[#f7f8fc]/70 text-[var(--color-text-primary)] hover:border-[#635bdb]/30 hover:bg-[#f0efff]/40'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  primary ? 'bg-white/15 text-white' : 'bg-white text-[#635bdb] ring-1 ring-[var(--color-border)]'
                }`}
              >
                <Icon size={17} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold">{title}</div>
                <div
                  className={`truncate text-[11.5px] ${
                    primary ? 'text-indigo-100' : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  {subtitle}
                </div>
              </div>
            </div>
            <ArrowRight
              size={15}
              className={`shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
                primary ? 'text-white/80' : 'text-slate-400 group-hover:text-[#635bdb]'
              }`}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
