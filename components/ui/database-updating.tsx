"use client";

import { useFormStatus } from "react-dom";

export function DatabaseUpdating({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 px-6 backdrop-blur-sm" role="status" aria-live="polite" aria-label="データベースを更新中">
      <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto block size-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" aria-hidden="true" />
        <p className="mt-5 text-lg font-bold text-slate-900">データを更新しています</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">完了するまで、このまましばらくお待ちください。</p>
      </div>
    </div>
  );
}

export function PendingDatabaseUpdate() {
  const { pending } = useFormStatus();
  return <DatabaseUpdating active={pending} />;
}
