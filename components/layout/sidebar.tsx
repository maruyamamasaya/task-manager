"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/login/actions";
import { Icon, type IconName } from "@/components/ui/icon";

const groups: { label: string; items: [string, string, IconName][] }[] = [
  { label: "ワークスペース", items: [["Today", "/today", "today"], ["タスク", "/tasks", "tasks"], ["スケジュール", "/schedule", "schedule"], ["プロジェクト", "/projects", "projects"], ["WBS", "/wbs", "wbs"]] },
  { label: "レビュー", items: [["振り返り", "/reflections", "reflections"], ["休日設定", "/holidays", "holidays"]] },
];
const mobileItems = groups[0].items;

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return <>
    <aside className="hidden h-screen w-[244px] shrink-0 flex-col border-r border-slate-200/80 bg-white px-4 py-5 md:sticky md:top-0 md:flex">
      <Link href="/today" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-500"><span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm font-semibold text-white">T</span><span className="text-base font-semibold tracking-tight">Taskflow</span></Link>
      <div className="mt-8 flex-1 space-y-7">{groups.map(group => <section key={group.label}><h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</h2><nav className="space-y-1">{group.items.map(([label, href, icon]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors ${active(href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}><Icon name={icon} className="size-[18px] shrink-0"/>{label}</Link>)}</nav></section>)}</div>
      <div className="border-t border-slate-200 pt-4"><div className="flex items-center gap-2.5 px-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">{email.slice(0, 1).toUpperCase()}</span><p className="min-w-0 truncate text-xs text-slate-600">{email}</p></div><form action={logout}><button className="mt-2 flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"><Icon name="logout" className="size-4"/>ログアウト</button></form></div>
    </aside>
    <nav aria-label="モバイルナビゲーション" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1 md:hidden">{mobileItems.map(([label, href, icon]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium ${active(href) ? "text-indigo-700" : "text-slate-500"}`}><Icon name={icon} className="size-5"/>{label}</Link>)}<Link href="/reflections" className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium ${active("/reflections") || active("/holidays") ? "text-indigo-700" : "text-slate-500"}`}><Icon name="more" className="size-5"/>その他</Link></nav>
  </>;
}
