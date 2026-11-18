import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Role } from '../types';
import api, { AUTH_EXPIRED_EVENT, ROLE_CHANGED_EVENT } from '../services/api';

type AuthUser = { id: number; fullName: string; email: string; role: Role };

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('bright_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('bright_token'));
  // NOTE: the cached user only drives the UI. The backend re-checks the role from the database on every request.
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  const storeUser = (next: AuthUser) => {
    setUser(next);
    localStorage.setItem('bright_user', JSON.stringify(next));
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('bright_token');
    localStorage.removeItem('bright_user');
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await api.post<{
        token: string;
        userId: number;
        fullName: string;
        email: string;
        role: Role;
      }>('/auth/login', { email: email.trim().toLowerCase(), password });
      setToken(data.token);
      localStorage.setItem('bright_token', data.token);
      storeUser({ id: data.userId, fullName: data.fullName, email: data.email, role: data.role });
      return true;
    } catch {
      return false;
    }
  };

  /** Pull the authoritative role from the server (e.g. after an admin granted/revoked TEACHER). */
  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('bright_token')) return;
    try {
      const { data } = await api.get<AuthUser>('/auth/me');
      storeUser({ id: data.id, fullName: data.fullName, email: data.email, role: data.role });
    } catch {
      // 401 is handled globally by the AUTH_EXPIRED_EVENT listener below.
    }
  }, []);

  // Resync on app start and whenever the tab regains focus.
  useEffect(() => {
    if (!token) return;
    void refreshUser();
    const onFocus = () => { void refreshUser(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [token, refreshUser]);

  // Token expired / account locked / account deleted -> sign out locally.
  // 403 from the API -> role may have changed server-side, resync it.
  useEffect(() => {
    const onExpired = () => logout();
    const onRoleChanged = () => { void refreshUser(); };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    window.addEventListener(ROLE_CHANGED_EVENT, onRoleChanged);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      window.removeEventListener(ROLE_CHANGED_EVENT, onRoleChanged);
    };
  }, [logout, refreshUser]);

  const hasRole = useCallback((...roles: Role[]) => !!user && roles.includes(user.role), [user]);

  const value = useMemo(
    () => ({ token, user, login, logout, refreshUser, hasRole }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, user, logout, refreshUser, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
