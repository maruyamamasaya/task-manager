"use server";
import { revalidatePath } from "next/cache"; import { redirect } from "next/navigation"; import { createClient } from "@/lib/supabase/server";
import { isValidWbsCode, nextWbsCode, normalizeWbsCode, parentWbsCode } from "@/lib/wbs/hierarchy";
import type { WbsItem } from "@/lib/wbs/types";
async function context(){const db=await createClient();const {data:{user},error}=await db.auth.getUser();if(error||!user){console.error("Supabase auth error:",error);throw new Error("ログインユーザーを確認できませんでした。再ログインしてください。");}return {db,user}}
const message=(error:string)=>{if(error.includes("project_not_found"))return "プロジェクトが見つかりません。共有コードを確認してください。";if(error.includes("join_disabled"))return "現在このプロジェクトへの参加は許可されていません。";if(error.includes("already_"))return "すでに参加済み、または所有者です。";if(error.includes("request_pending"))return "参加申請はすでに送信済みです。";return "処理を完了できませんでした。"}

const SHARE_CODE_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_SHARE_CODE_ATTEMPTS=5;

function generateShareCode(){
  const bytes=crypto.getRandomValues(new Uint8Array(8));
  const token=Array.from(bytes,byte=>SHARE_CODE_ALPHABET[byte%SHARE_CODE_ALPHABET.length]).join("");
  return `WBSP-${token.slice(0,4)}-${token.slice(4)}`;
}

export async function createWbsProject(form:FormData){
  const db=await createClient();
  const {data:{user},error:userError}=await db.auth.getUser();
  if(userError||!user){
    console.error("WBS create auth error:",userError);
    throw new Error("ログインユーザーを確認できませんでした。再ログインしてください。");
  }

  console.log("WBS owner check",{
    authenticated:!!user,
    userId:user.id,
  });

  const name=String(form.get("name")??"").trim();
  const description=String(form.get("description")??"").trim();
  if(!name)throw new Error("WBS名を入力してください。");
  if(name.length>200)throw new Error("WBS名は200文字以内で入力してください。");
  if(description.length>5000)throw new Error("説明は5000文字以内で入力してください。");

  let projectId:string|undefined;
  for(let attempt=1;attempt<=MAX_SHARE_CODE_ATTEMPTS;attempt++){
    const projectData={
      id:crypto.randomUUID(),
      name,
      description:description||null,
      status:"active",
      share_code:generateShareCode(),
      join_mode:"approval",
    };
    const insertData={
      ...projectData,
      owner_user_id:user.id,
    };

    console.log("WBS INSERT CHECK",{
      authUserId:user.id,
      insertOwnerUserId:insertData.owner_user_id,
      same:insertData.owner_user_id===user.id,
    });

    // Keep this as an INSERT-only request so SELECT policies cannot affect creation.
    const {error}=await db.from("wbs_projects").insert(insertData);

    if(!error){projectId=insertData.id;break;}
    if(error.code==="23505"&&attempt<MAX_SHARE_CODE_ATTEMPTS)continue;

    console.error("WBS create error:",error);
    throw new Error(process.env.NODE_ENV==="development"
      ?`WBSを作成できませんでした。code=${error.code}, message=${error.message}`
      :"WBSを作成できませんでした。");
  }

  if(!projectId){
    console.error("WBS create error:",{code:"23505",message:"Share code remained non-unique after retries",attempts:MAX_SHARE_CODE_ATTEMPTS});
    throw new Error("共有コードの生成に失敗しました。もう一度お試しください。");
  }

  redirect(`/wbs/${projectId}`);
}
export async function joinWbsProject(_:unknown,form:FormData){const {db}=await context();const {data,error}=await db.rpc("join_wbs_project",{p_share_code:String(form.get("shareCode")??"").trim().toUpperCase()});if(error)return {error:message(error.message)};revalidatePath("/wbs");return {ok:data==="pending"?"参加申請を送信しました。プロジェクト所有者の承認をお待ちください。":"プロジェクトに参加しました。"}}
export async function saveWbsItem(projectId:string,itemId:string|null,parentId:string|null,form:FormData){
 const {db,user}=await context(); const {data}=await db.from("wbs_items").select("*").eq("project_id",projectId); const items=(data??[]) as WbsItem[];
 const current=itemId?items.find(item=>item.id===itemId):null; const requested=normalizeWbsCode(String(form.get("wbs_code")??"")); const code=requested||nextWbsCode(items,parentId);
 if(!isValidWbsCode(code))return {error:"WBS番号は 1 または 1.2.3 の形式で入力してください。"};
 const parentCode=parentWbsCode(code); const resolvedParent=parentCode?items.find(item=>item.wbs_code===parentCode):null;
 if(parentCode&&!resolvedParent)return {error:`上位階層「${parentCode}」が存在しません。先に上位項目を作成してください。`};
 const nextParentId=resolvedParent?.id??null; if(itemId&&nextParentId===itemId)return {error:"項目自身を親にはできません。"};
 const oldCode=current?.wbs_code??null; const descendants=oldCode?items.filter(item=>item.id!==itemId&&item.wbs_code?.startsWith(`${oldCode}.`)):[];
 const changes=new Map<string,string>([[itemId??"__new",code],...descendants.map(item=>[item.id,`${code}${item.wbs_code!.slice(oldCode!.length)}`] as [string,string])]);
 const unaffected=new Set(items.filter(item=>!changes.has(item.id)).map(item=>item.wbs_code));
 if(new Set(changes.values()).size!==changes.size||[...changes.values()].some(value=>unaffected.has(value)))return {error:"そのWBS番号はすでに使用されています。変更は保存されませんでした。"};
 const status=String(form.get("status")??"not_started"),progress=status==="completed"?100:Number(form.get("progress")??0); const segment=Number(code.split(".").at(-1));
 const values={project_id:projectId,parent_id:nextParentId,wbs_code:code,sort_order:segment,name:String(form.get("name")??"").trim(),description:String(form.get("description")??"")||null,start_date:String(form.get("start_date")??"")||null,end_date:String(form.get("end_date")??"")||null,owner_name:String(form.get("owner_name")??"")||null,status,progress,estimate_hours:String(form.get("estimate_hours")??"")===""?null:Number(form.get("estimate_hours")),actual_hours:String(form.get("actual_hours")??"")===""?null:Number(form.get("actual_hours")),note:String(form.get("note")??"")||null,created_by:user.id};
 const result=itemId?await db.from("wbs_items").update(values).eq("id",itemId):await db.from("wbs_items").insert(values); if(result.error)return {error:result.error.code==="23505"?"そのWBS番号はすでに使用されています。変更は保存されませんでした。":"項目を保存できませんでした。入力内容と権限を確認してください。"};
 for(const descendant of descendants){const newCode=changes.get(descendant.id)!;const {error}=await db.from("wbs_items").update({wbs_code:newCode,sort_order:Number(newCode.split(".").at(-1))}).eq("id",descendant.id);if(error)return {error:"子項目のWBS番号を更新できませんでした。"}}
 revalidatePath(`/wbs/${projectId}`);revalidatePath("/wbs");return {ok:true};
}
export async function updateWbsItemField(projectId:string,itemId:string,field:"status"|"owner_name"|"estimate_hours"|"actual_hours",value:string){const {db}=await context();const allowed=field==="status"?["not_started","in_progress","completed","on_hold"].includes(value):field==="owner_name"?value.length<=200:value===""||(!Number.isNaN(Number(value))&&Number(value)>=0);if(!allowed)return {error:"入力値が正しくありません。"};const stored=field.endsWith("hours")?(value===""?null:Number(value)):value||null;const payload:Record<string,string|number|null>={[field]:stored};if(field==="status"&&value==="completed")payload.progress=100;const {error}=await db.from("wbs_items").update(payload).eq("id",itemId).eq("project_id",projectId);if(error)return {error:"変更を保存できませんでした。"};revalidatePath(`/wbs/${projectId}`);revalidatePath("/wbs");return {ok:true}}
export async function deleteWbsItem(projectId:string,itemId:string){const {db}=await context();const {error}=await db.from("wbs_items").delete().eq("id",itemId);if(error)return {error:"項目を削除できませんでした。"};revalidatePath(`/wbs/${projectId}`);return {ok:true}}
export async function deleteWbsProject(projectId:string){const {db}=await context();const {error}=await db.from("wbs_projects").delete().eq("id",projectId);if(error)return {error:"プロジェクトを削除できませんでした。"};redirect("/wbs")}
