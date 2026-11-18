import { History } from 'lucide-react';

export function ExerciseHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">Portal</div>
        <h2 className="mt-1 text-2xl font-bold text-slate-800">Lịch sử làm bài</h2>
        <p className="mt-1 text-sm text-slate-500">Theo dõi kết quả, điểm số và thời gian nộp bài.</p>
      </div>

      <section className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <History size={30} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-800">Chưa có lịch sử làm bài</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Khu vực lịch sử làm bài hiện đang để trống. Dữ liệu kết quả làm bài sẽ được cập nhật vào đây sau.
        </p>
      </section>
    </div>
  );
}
