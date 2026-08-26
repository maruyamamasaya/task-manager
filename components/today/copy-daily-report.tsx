"use client";

import { useState } from "react";

export function CopyDailyReport({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
    >
      {copied ? "コピーしました ✓" : "Markdownをコピー"}
    </button>
  );
}
