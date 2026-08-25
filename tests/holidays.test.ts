import test from "node:test";
import assert from "node:assert/strict";
import { holidayName,japaneseHolidays } from "../lib/time/japanese-holidays";

test("lists fixed, equinox, and Happy Monday holidays",()=>{
  assert.equal(holidayName("2026-01-01"),"元日");
  assert.equal(holidayName("2026-03-20"),"春分の日");
  assert.equal(holidayName("2026-07-20"),"海の日");
});

test("adds substitute holidays",()=>{
  const holidays=japaneseHolidays(2026);
  assert.equal(holidays.get("2026-05-06"),"振替休日");
});
