import { Trophy } from 'lucide-react';

export function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">Portal</div>
        <h2 className="mt-1 text-2xl font-bold text-slate-800">Bảng xếp hạng</h2>
        <p className="mt-1 text-sm text-slate-500">Vinh danh các học viên có thành tích xuất sắc nhất.</p>
      </div>

      <section className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <Trophy size={30} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-800">Chưa có dữ liệu xếp hạng</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Khu vực bảng xếp hạng hiện đang để trống. Dữ liệu điểm số và thứ hạng học viên sẽ được cập nhật vào đây sau.
        </p>
      </section>
    </div>
  );
}
