import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';

export function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <ShieldAlert size={28} />
      </div>
      <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">403 Forbidden</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-800">Bạn không có quyền truy cập trang này</h2>
      <p className="mt-2 text-sm text-slate-500">
        Tài khoản của bạn ({user?.role ?? 'GUEST'}) không được cấp quyền cho chức năng này.
        Nếu bạn là giáo viên, vui lòng liên hệ quản trị viên để được cấp quyền Teacher.
      </p>
      <Link to="/dashboard" className="mt-6 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white">
        Về Dashboard
      </Link>
    </div>
  );
}

/** UI-only guard. The backend independently enforces every permission. */
export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <ForbiddenPage />;
  }
  return <>{children}</>;
}
