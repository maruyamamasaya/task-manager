import test from "node:test";
import assert from "node:assert/strict";
import { flattenWbs, isValidWbsCode, nextWbsCode, parentWbsCode } from "../lib/wbs/hierarchy.js";
import type { WbsItem } from "../lib/wbs/types.js";

const item=(id:string,parent_id:string|null,wbs_code:string,sort_order:number):WbsItem=>({id,parent_id,wbs_code,sort_order,project_id:"p",name:id,description:null,start_date:null,end_date:null,owner_name:null,status:"not_started",progress:0,estimate_hours:null,actual_hours:null,note:null,created_by:null,created_at:id,updated_at:id});

test("custom WBS numbers preserve intentional gaps",()=>{const items=[item("a",null,"1",1),item("b",null,"2",2),item("c",null,"4",4)];assert.deepEqual(flattenWbs(items).map(row=>row.code),["1","2","4"]);assert.equal(nextWbsCode(items,null),"5");});
test("nested codes identify their required parent",()=>{assert.equal(parentWbsCode("1.1.3"),"1.1");assert.equal(parentWbsCode("2"),null);assert.equal(isValidWbsCode("1.1.3"),true);assert.equal(isValidWbsCode("1..3"),false);});
