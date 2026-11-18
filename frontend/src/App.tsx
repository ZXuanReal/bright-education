import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { useAuth } from './contexts/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ExerciseHistoryPage } from './pages/ExerciseHistoryPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { ForbiddenPage, RequireRole } from './pages/ForbiddenPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';

function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route
        path="/dashboard"
        element={<AppShell><DashboardPage /></AppShell>}
      />
      <Route
        path="/documents"
        element={<AppShell><DocumentsPage /></AppShell>}
      />
      <Route
        path="/exercises"
        element={<AppShell><ExercisesPage /></AppShell>}
      />
      <Route
        path="/exercise-history"
        element={<AppShell><ExerciseHistoryPage /></AppShell>}
      />
      <Route
        path="/leaderboard"
        element={<AppShell><LeaderboardPage /></AppShell>}
      />
      <Route
        path="/users"
        element={<AppShell><RequireRole roles={['ADMIN']}><UsersPage /></RequireRole></AppShell>}
      />
      <Route
        path="/forbidden"
        element={<AppShell><ForbiddenPage /></AppShell>}
      />
      <Route
        path="*"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}
