import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Lock, Pencil, ShieldCheck, Trash2, Unlock, UserMinus, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Role, User } from '../types';

function getErrorMessage(requestError: unknown) {
  const response = (requestError as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message || 'The user request could not be completed.';
}

type RoleFilter = 'ALL' | Role;

type PendingAction = {
  kind: 'grant' | 'revoke' | 'lock' | 'unlock';
  user: User;
};

const roleBadge: Record<Role, string> = {
  ADMIN: 'bg-rose-50 text-rose-700 ring-rose-100',
  TEACHER: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  STUDENT: 'bg-sky-50 text-sky-700 ring-sky-100',
};

const roleLabel: Record<Role, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student / User',
};

const actionCopy: Record<PendingAction['kind'], { title: string; body: (u: User) => string; confirm: string; tone: string }> = {
  grant: {
    title: 'Cấp quyền Teacher',
    body: (u) => `Cấp quyền Teacher cho ${u.fullName} (${u.email})? Tài khoản sẽ được upload tài liệu/video và tạo thư mục.`,
    confirm: 'Cấp quyền',
    tone: 'bg-emerald-600 hover:bg-emerald-700',
  },
  revoke: {
    title: 'Thu hồi quyền Teacher',
    body: (u) => `Thu hồi quyền Teacher của ${u.fullName} (${u.email})? Tài khoản sẽ trở về Student/User và mất quyền Teacher ngay ở request tiếp theo.`,
    confirm: 'Thu hồi',
    tone: 'bg-amber-600 hover:bg-amber-700',
  },
  lock: {
    title: 'Khóa tài khoản',
    body: (u) => `Khóa tài khoản ${u.fullName} (${u.email})? Người dùng sẽ không thể đăng nhập và mọi phiên hiện tại bị vô hiệu.`,
    confirm: 'Khóa',
    tone: 'bg-red-600 hover:bg-red-700',
  },
  unlock: {
    title: 'Mở khóa tài khoản',
    body: (u) => `Mở khóa tài khoản ${u.fullName} (${u.email})?`,
    confirm: 'Mở khóa',
    tone: 'bg-violet-600 hover:bg-violet-700',
  },
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '', role: 'STUDENT' as Role });
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    let active = true;
    api.get<User[]>('/users').then(({ data }) => {
      if (active) setUsers(data);
    }).catch((requestError: unknown) => {
      if (active) setError(getErrorMessage(requestError));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [currentUser?.role]);

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return users.filter((record) => {
      if (roleFilter !== 'ALL' && record.role !== roleFilter) return false;
      if (!search) return true;
      return `${record.fullName} ${record.email}`.toLowerCase().includes(search);
    });
  }, [searchTerm, roleFilter, users]);

  const counts = useMemo(() => ({
    ADMIN: users.filter((u) => u.role === 'ADMIN').length,
    TEACHER: users.filter((u) => u.role === 'TEACHER').length,
    STUDENT: users.filter((u) => u.role === 'STUDENT').length,
  }), [users]);

  const replaceUser = (updated: User) => {
    setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
  };

  const openEditUser = (record: User) => {
    setEditingUser(record);
    setEditForm({
      fullName: record.fullName,
      email: record.email,
      phone: record.phone ?? '',
      role: record.role,
    });
    setError('');
    setNotice('');
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post<User>('/users', null, {
        params: { fullName: fullName.trim(), email: email.trim().toLowerCase(), password, phone: phone.trim(), role },
      });
      setUsers((current) => [...current, data]);
      setNotice(`Đã tạo tài khoản ${data.fullName} (${roleLabel[data.role]}).`);
      setCreateOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setRole('STUDENT');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const submitEditUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    try {
      setActionBusy(true);
      setError('');
      const { data } = await api.patch<User>(`/users/${editingUser.id}`, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim().toLowerCase(),
        phone: editForm.phone.trim(),
        role: editForm.role,
      });
      replaceUser(data);
      setNotice(`Đã cập nhật tài khoản ${data.fullName}.`);
      setEditingUser(null);
    } catch (requestError) {
      setError(`Cập nhật thất bại: ${getErrorMessage(requestError)}`);
    } finally {
      setActionBusy(false);
    }
  };

  const deleteSelectedUser = async () => {
    if (!deleteUser) return;
    try {
      setDeleteBusy(true);
      setError('');
      await api.delete(`/users/${deleteUser.id}`);
      setUsers((current) => current.filter((u) => u.id !== deleteUser.id));
      setNotice(`Đã xóa tài khoản ${deleteUser.fullName}.`);
      setDeleteUser(null);
    } catch (requestError) {
      setError(`Xóa tài khoản thất bại: ${getErrorMessage(requestError)}`);
    } finally {
      setDeleteBusy(false);
    }
  };

  const runPendingAction = async () => {
    if (!pending) return;
    setActionBusy(true);
    setError('');
    setNotice('');
    const { kind, user: target } = pending;
    try {
      let data: User;
      if (kind === 'grant') {
        ({ data } = await api.patch<User>(`/users/${target.id}/grant-teacher`));
        setNotice(`Đã cấp quyền Teacher cho ${data.fullName}.`);
      } else if (kind === 'revoke') {
        ({ data } = await api.patch<User>(`/users/${target.id}/revoke-teacher`));
        setNotice(`Đã thu hồi quyền Teacher của ${data.fullName}. Tài khoản đã trở về Student/User.`);
      } else {
        ({ data } = await api.patch<User>(`/users/${target.id}/status`, { enabled: kind === 'unlock' }));
        setNotice(kind === 'lock' ? `Đã khóa tài khoản ${data.fullName}.` : `Đã mở khóa tài khoản ${data.fullName}.`);
      }
      replaceUser(data);
    } catch (requestError) {
      setError(`Thao tác thất bại: ${getErrorMessage(requestError)}`);
    } finally {
      setActionBusy(false);
      setPending(null);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Only administrators can manage user accounts.</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý tài khoản &amp; phân quyền</h2>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading...' : `${users.length} tài khoản · ${counts.ADMIN} Admin · ${counts.TEACHER} Teacher · ${counts.STUDENT} Student/User`}
          </p>
        </div>
        <button type="button" onClick={() => { setError(''); setCreateOpen(true); }} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white">+ New user</button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <input aria-label="Search users" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm theo tên hoặc email" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <select aria-label="Filter by role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="ALL">Tất cả quyền</option>
          <option value="ADMIN">Admin</option>
          <option value="TEACHER">Teacher</option>
          <option value="STUDENT">Student / User</option>
        </select>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((record) => {
              const isSelf = record.id === currentUser.id;
              const isAdminRecord = record.role === 'ADMIN';
              return (
                <tr key={record.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {record.fullName}
                    {isSelf && <span className="ml-2 text-xs text-slate-400">(bạn)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{record.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${roleBadge[record.role]}`}>{roleLabel[record.role]}</span>
                  </td>
                  <td className={`px-4 py-3 ${record.enabled ? 'text-emerald-600' : 'text-red-500'}`}>{record.enabled ? 'Active' : 'Locked'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {isAdminRecord || isSelf ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <ShieldCheck size={14} /> {isSelf ? 'Tài khoản của bạn' : 'Admin được bảo vệ'}
                        </span>
                      ) : (
                        <>
                          <button type="button" onClick={() => openEditUser(record)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            <Pencil size={14} /> Sửa
                          </button>
                          <button type="button" onClick={() => setDeleteUser(record)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                            <Trash2 size={14} /> Xóa
                          </button>
                          {record.role === 'STUDENT' && (
                            <button type="button" onClick={() => setPending({ kind: 'grant', user: record })} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                              <GraduationCap size={14} /> Cấp Teacher
                            </button>
                          )}
                          {record.role === 'TEACHER' && (
                            <button type="button" onClick={() => setPending({ kind: 'revoke', user: record })} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">
                              <UserMinus size={14} /> Thu hồi Teacher
                            </button>
                          )}
                          {record.enabled ? (
                            <button type="button" onClick={() => setPending({ kind: 'lock', user: record })} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                              <Lock size={14} /> Khóa
                            </button>
                          ) : (
                            <button type="button" onClick={() => setPending({ kind: 'unlock', user: record })} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50">
                              <Unlock size={14} /> Mở khóa
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredUsers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-800">{actionCopy[pending.kind].title}</h3>
            <p className="text-sm text-slate-600">{actionCopy[pending.kind].body(pending.user)}</p>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={actionBusy} onClick={() => setPending(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
              <button type="button" disabled={actionBusy} onClick={runPendingAction} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${actionCopy[pending.kind].tone}`}>
                {actionBusy ? 'Đang xử lý...' : actionCopy[pending.kind].confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-800">Xóa tài khoản</h3>
            <p className="text-sm text-slate-600">Bạn đang xóa {deleteUser.fullName} ({deleteUser.email}). Hành động này không thể hoàn tác và sẽ ngăn người dùng đó đăng nhập tiếp.</p>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={deleteBusy} onClick={() => setDeleteUser(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60">Hủy</button>
              <button type="button" disabled={deleteBusy} onClick={deleteSelectedUser} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {deleteBusy ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={submitEditUser} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Chỉnh sửa tài khoản</h3>
              <button type="button" onClick={() => setEditingUser(null)} aria-label="Close edit user dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <label className="block text-sm font-medium text-slate-700">Full name<input value={editForm.fullName} onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))} required maxLength={100} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
            <label className="block text-sm font-medium text-slate-700">Email<input type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
            <label className="block text-sm font-medium text-slate-700">Phone (optional)<input type="tel" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
            <label className="block text-sm font-medium text-slate-700">Role<select value={editForm.role} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value as Role }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"><option value="STUDENT">Student / User</option><option value="TEACHER">Teacher</option><option value="ADMIN">Admin</option></select></label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={actionBusy} className="w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{actionBusy ? 'Saving...' : 'Save changes'}</button>
          </form>
        </div>
      )}

      {createOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <form onSubmit={createUser} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Create user</h3>
            <button type="button" onClick={() => setCreateOpen(false)} aria-label="Close create user dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
          </div>
          <label className="block text-sm font-medium text-slate-700">Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={100} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="block text-sm font-medium text-slate-700">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="block text-sm font-medium text-slate-700">Temporary password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="block text-sm font-medium text-slate-700">Phone (optional)<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="block text-sm font-medium text-slate-700">Role<select value={role} onChange={(event) => setRole(event.target.value as Role)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"><option value="STUDENT">Student / User</option><option value="TEACHER">Teacher</option><option value="ADMIN">Admin</option></select></label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? 'Creating...' : 'Create account'}</button>
        </form>
      </div>}
    </div>
  );
}
