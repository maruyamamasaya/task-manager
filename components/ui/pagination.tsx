"use client";

type PaginationProps = {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalItems, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(page, 1), totalPages);
  return (
    <nav aria-label="ページネーション" className="flex items-center justify-center gap-3 border-t border-slate-100 px-4 py-4">
      <button type="button" disabled={current === 1} onClick={() => onPageChange(current - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">
        ← 前へ
      </button>
      <span className="text-sm text-slate-500"><b className="text-slate-700">{current}</b> / {totalPages} ページ</span>
      <button type="button" disabled={current === totalPages} onClick={() => onPageChange(current + 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">
        次へ →
      </button>
    </nav>
  );
}
