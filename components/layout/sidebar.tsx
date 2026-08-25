"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/login/actions";

const items = [
  ["Dashboard", "/dashboard", "⌂"], ["Today", "/today", "◉"], ["Tasks", "/tasks", "✓"],
  ["Schedule", "/schedule", "▤"], ["Projects", "/projects", "◇"], ["Reflections", "/reflections", "↻"], ["Analytics", "/analytics", "⌁"],
] as const;

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  return <>
    <aside className="hidden h-screen w-[272px] shrink-0 flex-col border-r border-white/70 bg-white/75 p-5 shadow-[8px_0_40px_rgba(30,41,59,0.04)] backdrop-blur-xl md:sticky md:top-0 md:flex">
      <Link href="/dashboard" className="flex items-center gap-3 px-2 py-3 font-bold tracking-tight text-slate-900"><span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">T</span><span>Task<span className="text-indigo-600">flow</span></span></Link>
      <p className="mb-2 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Menu</p>
      <nav className="flex-1 space-y-1.5">{items.map(([label, href, icon]) => <Link key={href} href={href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${pathname === href ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"}`}><span className={`grid size-7 place-items-center rounded-lg text-base ${pathname === href ? "bg-white/15 text-indigo-200" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"}`}>{icon}</span>{label}{pathname === href && <span className="ml-auto size-1.5 rounded-full bg-indigo-400" />}</Link>)}</nav>
      <div className="rounded-2xl border border-white bg-white/70 p-3 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-bold text-indigo-700">{email.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-700">{email}</p><p className="text-[10px] text-emerald-600">● Online</p></div></div><form action={logout}><button className="mt-3 w-full rounded-lg border border-slate-100 px-2 py-2 text-left text-xs text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">ログアウト <span className="float-right">↗</span></button></form></div>
    </aside>
    <nav className="fixed inset-x-3 bottom-3 z-20 flex gap-1 overflow-x-auto rounded-2xl border border-white/80 bg-white/90 p-2 shadow-[0_12px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl md:hidden">{items.map(([label, href, icon]) => <Link key={href} href={href} aria-label={label} className={`min-w-14 flex-1 rounded-xl py-1.5 text-center text-[9px] transition ${pathname === href ? "bg-slate-900 font-semibold text-white" : "text-slate-500"}`}><span className="block text-base">{icon}</span>{label}</Link>)}</nav>
  </>;
}
