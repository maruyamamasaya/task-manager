import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <main className="grid min-h-screen place-items-center px-5 py-12">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
      <div className="mb-8"><div className="mb-5 grid size-11 place-items-center rounded-xl bg-indigo-600 text-xl font-bold text-white">T</div><h1 className="text-2xl font-bold">おかえりなさい</h1><p className="mt-2 text-sm text-slate-500">Task Manager にログインして、今日の仕事を始めましょう。</p></div>
      <LoginForm next={next} />
      <p className="mt-7 text-center text-xs text-slate-400">アカウント作成は管理者または Supabase Dashboard から行えます。</p>
    </section>
  </main>;
}
