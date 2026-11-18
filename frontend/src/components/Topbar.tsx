import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';

type TopbarProps = {
  onOpenMobileMenu: () => void;
};

type RouteMeta = {
  section: string;
  title: string;
};

const routeMetaMap: Record<string, RouteMeta> = {
  '/dashboard': { section: 'Overview', title: 'Dashboard' },
  '/documents': { section: 'Workspace', title: 'Documents' },
  '/exercises': { section: 'Workspace', title: 'Bài tập' },
  '/exercise-history': { section: 'Workspace', title: 'Lịch sử làm bài' },
  '/leaderboard': { section: 'Workspace', title: 'Bảng xếp hạng' },
  '/users': { section: 'Administration', title: 'Users & Roles' },
  '/forbidden': { section: 'Access', title: '403 Forbidden' },
};

const roleBadgeStyles: Record<Role, string> = {
  ADMIN: 'bg-[#f0efff] text-[#5146c8] ring-[#ddd6fe]',
  TEACHER: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  STUDENT: 'bg-sky-50 text-sky-700 ring-sky-200/80',
};

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const meta = routeMetaMap[location.pathname] ?? { section: 'Portal', title: 'Grow Brighter' };

  const initials =
    user?.fullName
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  // Keyboard shortcut: Cmd/Ctrl + K focuses search bar
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) {
      navigate('/documents');
      return;
    }
    navigate(`/documents?search=${encodeURIComponent(trimmed)}`);
  };

  const handleNavigate = (to: string) => {
    setMenuOpen(false);
    navigate(to);
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 border-b border-[var(--color-border)] bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Left: Mobile drawer button + Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb] lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] sm:flex">
            <span>Grow Brighter</span>
            <ChevronRight size={13} className="text-slate-300" />
            <span>{meta.section}</span>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="font-semibold text-[#635bdb]">{meta.title}</span>
          </nav>
          <div className="truncate font-display text-base font-bold text-[var(--color-text-primary)] sm:hidden">
            {meta.title}
          </div>
        </div>
      </div>

      {/* Right: Search + Profile Dropdown */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search documents..."
            aria-label="Search documents"
            className="h-9 w-56 rounded-xl border border-[var(--color-border)] bg-[#f7f8fc] pl-9 pr-14 text-[13px] text-[var(--color-text-primary)] placeholder:text-slate-400 transition focus:w-64 focus:border-[#635bdb] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635bdb]/15"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => setSearchValue('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 lg:inline-block">
              Ctrl K
            </kbd>
          )}
        </form>

        {/* Mobile search shortcut button */}
        <button
          type="button"
          onClick={() => navigate('/documents')}
          aria-label="Search documents"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-slate-600 transition hover:bg-slate-50 md:hidden"
        >
          <Search size={16} />
        </button>

        {/* User / Admin Profile Menu */}
        {user && (
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-left transition hover:border-slate-300 hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#635bdb] to-[#7c3aed] text-xs font-semibold text-white shadow-sm">
                {initials}
              </div>

              <div className="hidden min-w-0 md:block">
                <div className="max-w-[130px] truncate text-[13px] font-semibold leading-tight text-[var(--color-text-primary)]">
                  {user.fullName}
                </div>
                <div className="max-w-[130px] truncate text-[11px] text-[var(--color-text-secondary)]">
                  {user.email}
                </div>
              </div>

              <span
                className={`hidden rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide ring-1 sm:inline-flex ${roleBadgeStyles[user.role]}`}
              >
                {user.role}
              </span>

              <ChevronDown
                size={14}
                className={`hidden text-slate-400 transition-transform duration-150 sm:block ${
                  menuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-[var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-dropdown)]"
              >
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {user.fullName}
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${roleBadgeStyles[user.role]}`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                    {user.email}
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate('/dashboard')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-100/80"
                  >
                    <LayoutDashboard size={15} className="text-slate-400" />
                    Dashboard Overview
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate('/documents')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-100/80"
                  >
                    <FolderOpen size={15} className="text-slate-400" />
                    Document Library
                  </button>
                  {user.role === 'ADMIN' && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavigate('/users')}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-100/80"
                    >
                      <Users size={15} className="text-slate-400" />
                      Users &amp; Permissions
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
