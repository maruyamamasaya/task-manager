"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { minutesBetween, tokyoDateKey } from "@/lib/time/phase3";
async function context(){const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error("認証が必要です。");return {db,user};}
const refresh=()=>{revalidatePath("/tasks");revalidatePath("/today");revalidatePath("/schedule");revalidatePath("/dashboard");revalidatePath("/analytics");};
const isPast=(value:string)=>tokyoDateKey(value)<tokyoDateKey(new Date());
export async function saveSchedule(input:{id?:string;taskId:string;startAt:string;endAt:string}){const {db,user}=await context();if(isPast(input.startAt))return {error:"過去の予定は編集できません。"};if(new Date(input.startAt)>=new Date(input.endAt))return {error:"終了時刻は開始時刻より後にしてください。"};const row={task_id:input.taskId,user_id:user.id,start_at:input.startAt,end_at:input.endAt};const q=input.id?db.from("task_schedules").update(row).eq("id",input.id):db.from("task_schedules").insert(row);const {error}=await q;if(error)return {error:error.message};refresh();return {ok:true};}
export async function deleteSchedule(id:string){const {db}=await context();const {data}=await db.from("task_schedules").select("start_at").eq("id",id).single();if(data&&isPast(data.start_at))return {error:"過去の予定は削除できません。"};const {error}=await db.from("task_schedules").delete().eq("id",id);if(error)return {error:error.message};refresh();return {ok:true};}
export async function createMeeting(input:{name:string;startAt:string;duration:number}){const name=input.name.trim();if(!name)return {error:"会議名を入力してください。"};if(!Number.isInteger(input.duration)||input.duration<=0)return {error:"会議時間は1分以上の整数で入力してください。"};if(isPast(input.startAt))return {error:"過去の日付には作成できません。"};const {db,user}=await context();const endAt=new Date(new Date(input.startAt).getTime()+input.duration*60000).toISOString();const {error}=await db.from("meetings").insert({user_id:user.id,name,start_at:input.startAt,end_at:endAt});if(error)return {error:error.message};refresh();return {ok:true};}
export async function deleteMeeting(id:string){const {db}=await context();const {data}=await db.from("meetings").select("start_at").eq("id",id).single();if(data&&isPast(data.start_at))return {error:"過去の会議は削除できません。"};const {error}=await db.from("meetings").delete().eq("id",id);if(error)return {error:error.message};refresh();return {ok:true};}
export async function addWorkLog(taskId:string,minutes:number,note=""){if(!Number.isInteger(minutes)||minutes<=0)return {error:"1分以上の整数を入力してください。"};const {db,user}=await context();const end=new Date(),start=new Date(end.getTime()-minutes*60000);const {error}=await db.from("work_logs").insert({task_id:taskId,user_id:user.id,started_at:start.toISOString(),ended_at:end.toISOString(),minutes,note:note.trim()||null});if(error)return {error:error.message};refresh();return {ok:true};}
export async function correctActualMinutes(taskId:string,total:number){
  if(!Number.isInteger(total)||total<0)return {error:"実績は0分以上の整数で入力してください。"};
  const {db,user}=await context();
  const {data:logs,error:readError}=await db.from("work_logs").select("id,started_at,ended_at,minutes").eq("task_id",taskId).eq("user_id",user.id).order("created_at",{ascending:false});
  if(readError)return {error:readError.message};
  if(logs?.some(log=>!log.ended_at))return {error:"作業中のタイマーを停止してから実績を修正してください。"};
  const current=(logs??[]).reduce((sum,log)=>sum+(log.minutes??minutesBetween(log.started_at,log.ended_at!)),0);
  if(total===current)return {ok:true};
  if(total>current)return addWorkLog(taskId,total-current,"実績値の修正");
  let remove=current-total;
  for(const log of logs??[]){
    if(remove<=0)break;
    const minutes=log.minutes??minutesBetween(log.started_at,log.ended_at!);
    if(remove>=minutes){
      const {error}=await db.from("work_logs").delete().eq("id",log.id).eq("user_id",user.id);
      if(error)return {error:error.message};
      remove-=minutes;
    }else{
      const nextMinutes=minutes-remove;
      const startedAt=new Date(new Date(log.ended_at!).getTime()-nextMinutes*60000).toISOString();
      const {error}=await db.from("work_logs").update({minutes:nextMinutes,started_at:startedAt,note:"実績値の修正"}).eq("id",log.id).eq("user_id",user.id);
      if(error)return {error:error.message};
      remove=0;
    }
  }
  refresh();return {ok:true};
}
export async function startTimer(taskId:string){const {db}=await context();const {error}=await db.rpc("start_task_timer",{target_task:taskId});if(error)return {error:error.message.toLowerCase().includes("already running")?"別のタスクが作業中です。終了してから開始してください。":error.message};refresh();return {ok:true};}
export async function stopTimer(id:string,note=""){const {db}=await context();const {data}=await db.from("work_logs").select("started_at").eq("id",id).is("ended_at",null).single();if(!data)return {error:"作業中のログが見つかりません。"};const end=new Date().toISOString();const {error}=await db.from("work_logs").update({ended_at:end,minutes:minutesBetween(data.started_at,end),note:note.trim()||null}).eq("id",id).is("ended_at",null);if(error)return {error:error.message};refresh();return {ok:true};}
export async function updateWorkLog(id:string,input:{startedAt:string;endedAt:string;note:string}){const {db}=await context();if(new Date(input.startedAt)>new Date(input.endedAt))return {error:"終了時刻を確認してください。"};const {error}=await db.from("work_logs").update({started_at:input.startedAt,ended_at:input.endedAt,minutes:minutesBetween(input.startedAt,input.endedAt),note:input.note.trim()||null}).eq("id",id);if(error)return {error:error.message};refresh();return {ok:true};}
export async function deleteWorkLog(id:string){const {db}=await context();const {error}=await db.from("work_logs").delete().eq("id",id);if(error)return {error:error.message};refresh();return {ok:true};}
