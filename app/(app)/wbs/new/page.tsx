import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { createWbsProject } from "../actions";

const fieldClass = "mt-1.5 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500";
export default function NewWbs() {
  return <div className="max-w-2xl">
    <PageHeader title="新しいWBSを作成" description="プロジェクトの基本情報を入力してください。" />
    <form action={createWbsProject} className="space-y-5">
      <label className="block text-sm font-medium text-slate-700">プロジェクト名 <span className="text-red-600">*</span><input name="name" maxLength={200} required className={fieldClass} /></label>
      <label className="block text-sm font-medium text-slate-700">説明<textarea name="description" maxLength={5000} rows={4} className={fieldClass} /></label>
      <label className="block text-sm font-medium text-slate-700">参加方式<select name="join_mode" defaultValue="approval" disabled className={`${fieldClass} text-slate-600 disabled:bg-slate-50`}><option value="approval">承認制</option></select><span className="mt-1.5 block text-xs font-normal text-slate-500">参加申請をオーナーが承認します。</span></label>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-5"><Link href="/wbs" className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">キャンセル</Link><button className="min-h-9 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700">作成</button></div>
    </form>
  </div>;
}
