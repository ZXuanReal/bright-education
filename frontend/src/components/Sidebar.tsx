import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type NavGroup = {
  heading: string;
  items: {
    to: string;
    label: string;
    icon: LucideIcon;
  }[];
};

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const groups: NavGroup[] = [
    {
      heading: 'Overview',
      items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      heading: 'Workspace',
      items: [
        { to: '/documents', label: 'Documents', icon: FolderOpen },
        { to: '/exercises', label: 'Bài tập', icon: ClipboardList },
        { to: '/exercise-history', label: 'Lịch sử làm bài', icon: History },
        { to: '/leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
      ],
    },
    ...(user?.role === 'ADMIN'
      ? [
          {
            heading: 'Administration',
            items: [{ to: '/users', label: 'Users & Roles', icon: Users }],
          },
        ]
      : []),
  ];

  const handleLogout = () => {
    onCloseMobile();
    logout();
    navigate('/login');
  };

  const renderSidebarBody = (isMobile: boolean) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div className="flex h-full flex-col bg-white">
        {/* Brand Header */}
        <div
          className={`flex h-[72px] shrink-0 items-center border-b border-[var(--color-border)] ${
            isCollapsed ? 'justify-center px-3' : 'justify-between px-5'
          }`}
        >
          <NavLink
            to="/dashboard"
            onClick={isMobile ? onCloseMobile : undefined}
            className="flex min-w-0 items-center gap-3 focus:outline-none"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#635bdb] to-[#7c3aed] text-white shadow-sm shadow-indigo-500/25">
              <Sparkles size={19} strokeWidth={2.2} />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate font-display text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
                  Grow Brighter
                </div>
                <div className="truncate text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Bright English Portal
                </div>
              </div>
            )}
          </NavLink>

          {isMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb]"
            >
              <X size={18} />
            </button>
          ) : (
            !isCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb]"
              >
                <ChevronLeft size={16} />
              </button>
            )
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-slate-50/70 text-slate-500 transition hover:bg-[#f0efff] hover:text-[#635bdb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb]"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Navigation Groups */}
        <nav aria-label="Primary navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.heading}>
              {!isCollapsed ? (
                <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {group.heading}
                </div>
              ) : (
                <div className="mx-3 mb-2 border-t border-slate-100" />
              )}
              <div className="space-y-1">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={isMobile ? onCloseMobile : undefined}
                    title={isCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb] ${
                        isCollapsed ? 'justify-center px-2' : ''
                      } ${
                        isActive
                          ? 'bg-[#f0efff] font-semibold text-[#5146c8]'
                          : 'font-medium text-[var(--color-text-secondary)] hover:bg-slate-100/80 hover:text-[var(--color-text-primary)]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && !isCollapsed && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#635bdb]"
                          />
                        )}
                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2.2 : 1.85}
                          className={`shrink-0 transition-colors ${
                            isActive
                              ? 'text-[#635bdb]'
                              : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{label}</span>}

                        {/* Tooltip when collapsed on desktop */}
                        {isCollapsed && (
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block"
                          >
                            {label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer / Account Summary & Sign Out */}
        <div className="border-t border-[var(--color-border)] p-3">
          {!isCollapsed && user && (
            <div className="mb-2.5 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
              <ShieldCheck size={15} className="shrink-0 text-[#635bdb]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-slate-700">{user.fullName}</div>
                <div className="text-[11px] font-medium text-slate-400">{user.role} workspace</div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title={isCollapsed ? 'Sign out' : undefined}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb] ${
              isCollapsed ? 'justify-center px-2' : ''
            }`}
          >
            <LogOut size={17} strokeWidth={1.85} className="shrink-0 text-slate-400 group-hover:text-red-500" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-[var(--color-border)] bg-white transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:block lg:h-screen ${
          collapsed ? 'w-[78px]' : 'w-[260px]'
        }`}
      >
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-[272px] max-w-[85vw] border-r border-[var(--color-border)] bg-white shadow-2xl">
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}
    </>
  );
}
