"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "@/app/(auth)/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">{pending ? "ログイン中…" : "ログイン"}</button>;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(login, {});
  return <form action={action} className="space-y-5">
    <input type="hidden" name="next" value={next ?? ""} />
    <label className="block text-sm font-medium text-slate-700">メールアドレス<input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500" placeholder="you@example.com" /></label>
    <label className="block text-sm font-medium text-slate-700">パスワード<input name="password" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500" placeholder="••••••••" /></label>
    {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
    <SubmitButton />
  </form>;
}
