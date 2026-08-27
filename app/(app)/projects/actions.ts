"use server";
import { revalidatePath } from "next/cache"; import { createClient } from "@/lib/supabase/server";
async function dbUser(){const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error("認証が必要です");return {db,user};}
export async function createProject(name:string){const {db,user}=await dbUser();const {error}=await db.from("projects").insert({name:name.trim(),user_id:user.id});if(error)return {error:error.message};revalidatePath("/projects");return {ok:true};}
export async function renameProject(id:string,name:string){const {db}=await dbUser();const {error}=await db.from("projects").update({name:name.trim()}).eq("id",id);if(error)return {error:error.message};revalidatePath("/projects");return {ok:true};}
export async function archiveProject(id:string,archived:boolean){const {db}=await dbUser();const {error}=await db.from("projects").update({archived}).eq("id",id);if(error)return {error:error.message};revalidatePath("/projects");return {ok:true};}
export async function setProjectColor(id:string,color:string){const {db}=await dbUser();const {error}=await db.from("projects").update({color}).eq("id",id);if(error)return {error:error.message};revalidatePath("/projects");return {ok:true};}
export async function deleteProject(id:string){const {db}=await dbUser();const {error}=await db.from("projects").delete().eq("id",id);if(error)return {error:error.message};revalidatePath("/projects");revalidatePath("/tasks");return {ok:true};}
