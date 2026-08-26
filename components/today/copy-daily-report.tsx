"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

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
      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      <Icon name="clipboard" className="size-4" />{copied ? "コピーしました" : "報告をコピー"}
    </button>
  );
}
