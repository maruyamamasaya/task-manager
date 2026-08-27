import test from "node:test";
import assert from "node:assert/strict";
import { flattenWbs, isValidWbsCode, isWbsItemOverdue, leafEffortTotals, nextWbsCode, parentWbsCode, projectDateRange } from "../lib/wbs/hierarchy.js";
import type { WbsItem } from "../lib/wbs/types.js";

const item=(id:string,parent_id:string|null,wbs_code:string,sort_order:number):WbsItem=>({id,parent_id,wbs_code,sort_order,project_id:"p",name:id,description:null,start_date:null,end_date:null,owner_name:null,status:"not_started",progress:0,estimate_hours:null,actual_hours:null,note:null,created_by:null,created_at:id,updated_at:id});

test("custom WBS numbers preserve intentional gaps",()=>{const items=[item("a",null,"1",1),item("b",null,"2",2),item("c",null,"4",4)];assert.deepEqual(flattenWbs(items).map(row=>row.code),["1","2","4"]);assert.equal(nextWbsCode(items,null),"5");});
test("nested codes identify their required parent",()=>{assert.equal(parentWbsCode("1.1.3"),"1.1");assert.equal(parentWbsCode("2"),null);assert.equal(isValidWbsCode("1.1.3"),true);assert.equal(isValidWbsCode("1..3"),false);});

test("overdue WBS items exclude today, completed, and on-hold items",()=>{const overdue={...item("a",null,"1",1),end_date:"2026-08-26"};assert.equal(isWbsItemOverdue(overdue,"2026-08-27"),true);assert.equal(isWbsItemOverdue({...overdue,end_date:"2026-08-27"},"2026-08-27"),false);assert.equal(isWbsItemOverdue({...overdue,status:"completed"},"2026-08-27"),false);assert.equal(isWbsItemOverdue({...overdue,status:"on_hold"},"2026-08-27"),false);});

test("effort totals count only leaf tasks and do not double-count parent rollups",()=>{
  const items=[
    {...item("parent",null,"1",1),estimate_hours:8,actual_hours:5},
    {...item("child-a","parent","1.1",1),estimate_hours:3,actual_hours:2},
    {...item("child-b","parent","1.2",2),estimate_hours:5,actual_hours:3},
    {...item("standalone",null,"2",2),estimate_hours:2,actual_hours:null},
  ];
  assert.deepEqual(leafEffortTotals(items),{estimate:10,actual:5});
});

test("project date range uses the earliest start and latest end",()=>{
  const items=[
    {...item("a",null,"1",1),start_date:"2026-09-01",end_date:"2026-09-12"},
    {...item("b",null,"2",2),start_date:"2026-08-28",end_date:null},
    {...item("c",null,"3",3),start_date:null,end_date:"2026-09-30"},
  ];
  assert.deepEqual(projectDateRange(items),{startDate:"2026-08-28",endDate:"2026-09-30"});
  assert.deepEqual(projectDateRange([]),{startDate:null,endDate:null});
});
