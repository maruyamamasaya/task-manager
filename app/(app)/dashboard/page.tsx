import { PageHeader } from "@/components/ui/page-header";

const stats = [["今日のタスク", "0", "件"], ["進行中", "0", "件"], ["完了", "0", "件"], ["予定時間", "0", "分"]];
export default function DashboardPage() {
  const date = new Intl.DateTimeFormat("ja-JP", { dateStyle: "full", timeZone: "Asia/Tokyo" }).format(new Date());
  return <><PageHeader title="Task Manager" description={date} /><section className="mb-8 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-7 text-white shadow-sm"><p className="text-sm text-indigo-100">今日も一歩ずつ</p><h2 className="mt-2 text-2xl font-bold">タスク管理を開始しましょう</h2><p className="mt-2 text-sm text-indigo-100">予定と実績をつなげて、仕事のリズムを整えます。</p></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, unit]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{value}<span className="ml-1 text-sm font-normal text-slate-400">{unit}</span></p></article>)}</section><p className="mt-5 text-xs text-slate-400">統計は Phase 5 で実データに接続されます。</p></>;
}
