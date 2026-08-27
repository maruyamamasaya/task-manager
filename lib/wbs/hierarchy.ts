import type { WbsItem } from "./types";
export interface WbsTreeRow { item:WbsItem; depth:number; code:string; hasChildren:boolean }
export function flattenWbs(items:WbsItem[]):WbsTreeRow[]{
  const children=new Map<string|null,WbsItem[]>(); for(const item of items){const list=children.get(item.parent_id)??[];list.push(item);children.set(item.parent_id,list)}
  for(const list of children.values())list.sort((a,b)=>a.sort_order-b.sort_order||a.created_at.localeCompare(b.created_at));
  const result:WbsTreeRow[]=[]; const visit=(parent:string|null,prefix:string,depth:number)=>{(children.get(parent)??[]).forEach((item,i)=>{const code=item.wbs_code||(prefix?`${prefix}.${i+1}`:`${i+1}`);result.push({item,depth,code,hasChildren:children.has(item.id)});visit(item.id,code,depth+1)})};visit(null,"",0);return result;
}
export const normalizeWbsCode=(value:string)=>value.trim().replace(/\s/g,"");
export const isValidWbsCode=(value:string)=>/^[1-9]\d*(\.[1-9]\d*)*$/.test(value);
export const parentWbsCode=(value:string)=>value.includes(".")?value.slice(0,value.lastIndexOf(".")):null;
export function nextWbsCode(items:WbsItem[],parentId:string|null){const parent=parentId?items.find(item=>item.id===parentId):null;const prefix=parent?.wbs_code?`${parent.wbs_code}.`:"";const used=items.filter(item=>item.parent_id===parentId).map(item=>Number((item.wbs_code??"").split(".").at(-1))).filter(Number.isFinite);return `${prefix}${Math.max(0,...used)+1}`}
export function wouldCreateCycle(items:WbsItem[],itemId:string,parentId:string|null){if(!parentId)return false;const byId=new Map(items.map(i=>[i.id,i]));let cursor:string|null=parentId;while(cursor){if(cursor===itemId)return true;cursor=byId.get(cursor)?.parent_id??null}return false}
export function leafProgress(items:WbsItem[]){if(!items.length)return 0;const parents=new Set(items.flatMap(i=>i.parent_id?[i.parent_id]:[]));const leaves=items.filter(i=>!parents.has(i.id));return Math.round(leaves.reduce((sum,i)=>sum+i.progress,0)/Math.max(1,leaves.length))}
