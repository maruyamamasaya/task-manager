"use client";
import { useState,useTransition } from "react";
import { addWorkLog } from "@/app/(app)/phase3-actions";
import { totalWorkMinutes } from "@/lib/time/phase3";
import type { Task,WorkLog } from "@/types/database";

const button="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";

export function PlanActualPanel({task,logs}:{task:Task;logs:WorkLog[]}) {
  const [pending,go]=useTransition(),[message,setMessage]=useState(""),[custom,setCustom]=useState(25);
  const actual=totalWorkMinutes(logs);
  const run=(action:Promise<{error?:string;ok?:boolean}>)=>go(async()=>{const result=await action;setMessage(result.error??"保存しました");if(!result.error)location.reload()});

  return <section className="mt-6 border-t pt-5">
    <div className="flex items-baseline justify-between gap-3"><h3 className="font-bold">実績</h3><p className="text-sm text-slate-500">合計 <b className="text-slate-800">{actual}分</b></p></div>
    {/* 作業開始ボタンは今後の利用方針が決まるまで非表示にします。 */}
    <div className="mt-4"><p className="text-sm font-semibold">作業時間を追加</p><div className="mt-2 flex flex-wrap gap-2">{[15,30,60].map(m=><button type="button" className={button} disabled={pending} key={m} onClick={()=>run(addWorkLog(task.id,m))}>+{m}分</button>)}<input aria-label="任意の分数" type="number" min="1" value={custom} onChange={e=>setCustom(Number(e.target.value))} className="w-20 rounded-lg border px-2 text-sm"/><button type="button" className={button} disabled={pending||custom<1} onClick={()=>run(addWorkLog(task.id,custom))}>追加</button></div></div>
    {message&&<p role="status" className={`mt-3 text-sm ${message==="保存しました"?"text-emerald-700":"text-red-600"}`}>{message}</p>}
  </section>;
}
