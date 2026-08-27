import test from "node:test";
import assert from "node:assert/strict";
import {actualMinutes,averageProgress,needsReflection,parentProgress,planActual,projectProgress,shouldCreateProgressLog,stateFromProgress} from "../lib/tasks/phase4";
test("progress clamp and status conversion",()=>{assert.deepEqual(stateFromProgress(-4),{progress:0,status:"todo"});assert.deepEqual(stateFromProgress(44.6),{progress:45,status:"doing"});assert.deepEqual(stateFromProgress(200),{progress:100,status:"done"});});
test("average and parent progress",()=>{assert.equal(averageProgress([100,50,0]),50);assert.equal(parentProgress([{progress:10},{progress:11}]),11);assert.equal(averageProgress([]),0);});
test("project progress",()=>assert.deepEqual(projectProgress([{progress:100,status:"done"},{progress:50,status:"doing"}]),{total:2,done:1,progress:75}));
test("reflection waiting detection",()=>{assert.equal(needsReflection({status:"done",reflection_skipped:false}),true);assert.equal(needsReflection({status:"doing",reflection_skipped:false}),false);assert.equal(needsReflection({status:"done",reflection_skipped:true}),false);assert.equal(needsReflection({status:"done",reflection_skipped:false},{id:"r"} as never),false);});
test("plan actual and work log combination",()=>{const actual=actualMinutes([{minutes:82,started_at:"2026-01-01T00:00:00Z",ended_at:null}]);assert.deepEqual(planActual(60,actual),{planned:60,actual:82,difference:22,ratio:137});});
test("duplicate progress logs are suppressed",()=>{assert.equal(shouldCreateProgressLog(60,60),false);assert.equal(shouldCreateProgressLog(60,61),true);});
