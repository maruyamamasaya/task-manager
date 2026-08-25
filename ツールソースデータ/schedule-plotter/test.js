const assert = require("node:assert/strict");
const { parseTasks, toMinutes, toTime, snap, getOverlaps, scheduleText } = require("./app.js");

const markdown = `- [ ] 親タスク 【進捗: 20%】 （予：120分 / 実：）
  - [x] 子タスク 【進捗： 100 %】 （予：30分 / 実：30分）`;
const tasks = parseTasks(markdown);
assert.deepEqual(tasks, [
  { id: "task-0", name: "親タスク", depth: 0, completed: false, progress: 20, estimate: 120 },
  { id: "task-1", name: "子タスク", depth: 1, completed: true, progress: 100, estimate: 30 }
]);
assert.equal(toMinutes("14:30"), 870);
assert.equal(toTime(870), "14:30");
assert.equal(snap(76), 75);
assert.equal(snap(78), 80);
const blocks = [{ id: "a", taskId: "task-0", start: 540, end: 600 }, { id: "b", taskId: "task-1", start: 570, end: 630 }];
assert.deepEqual(getOverlaps(blocks), [{ start: 570, end: 600, ids: ["a", "b"] }]);
assert.equal(scheduleText("2026-08-10", blocks.slice(0, 1), tasks), "## 2026/08/10 スケジュール\n\n09:00 - 10:00\n親タスク");
assert.equal(scheduleText("2026-08-10", blocks.slice(0, 1), tasks, true), "09:00-10:00 親タスク");
console.log("All Schedule Plotter tests passed.");
