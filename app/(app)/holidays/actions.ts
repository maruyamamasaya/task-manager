"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DayOffStatus } from "@/types/database";
const statuses:DayOffStatus[]=["holiday","paid_leave","am_leave","pm_leave"];
export async function saveDayOff(formData:FormData){
  const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)throw new Error("認証が必要です。");
  const off_date=String(formData.get("off_date")??""),status=String(formData.get("status")??"") as DayOffStatus,note=String(formData.get("note")??"").trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(off_date)||!statuses.includes(status))throw new Error("日付と休みの種類を確認してください。");
  const {error}=await db.from("day_offs").upsert({user_id:user.id,off_date,status,note:note||null},{onConflict:"user_id,off_date"});if(error)throw error;
  revalidatePath("/holidays");revalidatePath("/schedule");
}
export async function updateDayOff(formData:FormData){
  const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)throw new Error("認証が必要です。");
  const id=String(formData.get("id")??""),off_date=String(formData.get("off_date")??""),status=String(formData.get("status")??"") as DayOffStatus,note=String(formData.get("note")??"").trim();
  if(!id||!/^\d{4}-\d{2}-\d{2}$/.test(off_date)||!statuses.includes(status))throw new Error("日付と休みの種類を確認してください。");
  const {error}=await db.from("day_offs").update({off_date,status,note:note||null}).eq("id",id).eq("user_id",user.id);if(error)throw error;
  revalidatePath("/holidays");revalidatePath("/schedule");redirect("/holidays");
}
export async function deleteDayOff(formData:FormData){const db=await createClient();const id=String(formData.get("id")??"");const {error}=await db.from("day_offs").delete().eq("id",id);if(error)throw error;revalidatePath("/holidays");revalidatePath("/schedule");}
