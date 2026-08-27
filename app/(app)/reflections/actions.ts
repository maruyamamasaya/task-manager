"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export type ReflectionInput={result:string;good_points:string;problems:string;improvements:string;next_action:string};
async function context(){const db=await createClient();const{data:{user}}=await db.auth.getUser();if(!user)throw new Error("認証が必要です。");return{db,user};}
export async function saveReflection(taskId:string,input:ReflectionInput){const{db,user}=await context();const{error}=await db.from("reflections").upsert({task_id:taskId,user_id:user.id,...input},{onConflict:"task_id"});if(error)return{error:error.message};revalidatePath("/reflections");revalidatePath("/tasks");return{ok:true};}
export async function deleteReflection(taskId:string){const{db}=await context();const{error}=await db.from("reflections").delete().eq("task_id",taskId);if(error)return{error:error.message};revalidatePath("/reflections");revalidatePath("/tasks");return{ok:true};}
export async function setReflectionSkipped(taskId:string,skipped:boolean){const{db,user}=await context();const{error}=await db.from("tasks").update({reflection_skipped:skipped}).eq("id",taskId).eq("user_id",user.id);if(error)return{error:error.message};revalidatePath("/reflections");revalidatePath("/tasks");revalidatePath("/dashboard");return{ok:true};}
