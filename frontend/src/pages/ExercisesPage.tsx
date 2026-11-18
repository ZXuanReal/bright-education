import { ClipboardList } from 'lucide-react';

export function ExercisesPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">Portal</div>
        <h2 className="mt-1 text-2xl font-bold text-slate-800">Bài tập</h2>
        <p className="mt-1 text-sm text-slate-500">Danh sách bài tập và bài kiểm tra dành cho học viên.</p>
      </div>

      <section className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <ClipboardList size={30} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-800">Chưa có bài tập nào</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Khu vực bài tập hiện đang để trống. Dữ liệu bài tập sẽ được cập nhật vào đây sau.
        </p>
      </section>
    </div>
  );
}
