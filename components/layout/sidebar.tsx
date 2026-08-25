"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/login/actions";

const items = [
  ["Dashboard", "/dashboard", "▦"], ["Today", "/today", "☀"], ["Tasks", "/tasks", "✓"],
  ["Schedule", "/schedule", "□"], ["Projects", "/projects", "◇"], ["Reflections", "/reflections", "↻"], ["Analytics", "/analytics", "⌁"],
] as const;

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  return <>
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:sticky md:top-0 md:flex">
      <Link href="/dashboard" className="flex items-center gap-3 px-2 py-4 font-bold"><span className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white">T</span>Task Manager</Link>
      <nav className="mt-5 flex-1 space-y-1">{items.map(([label, href, icon]) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === href ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}><span className="w-5 text-center">{icon}</span>{label}</Link>)}</nav>
      <div className="border-t border-slate-100 pt-4"><p className="truncate px-2 text-sm font-medium">{email}</p><form action={logout}><button className="mt-2 w-full rounded-lg px-2 py-2 text-left text-sm text-slate-500 hover:bg-slate-50">ログアウト</button></form></div>
    </aside>
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-slate-200 bg-white/95 px-1 py-2 backdrop-blur md:hidden">{items.slice(0, 5).map(([label, href, icon]) => <Link key={href} href={href} aria-label={label} className={`min-w-12 rounded-lg py-1 text-center text-xs ${pathname === href ? "text-indigo-700" : "text-slate-500"}`}><span className="block text-lg">{icon}</span>{label}</Link>)}</nav>
  </>;
}
