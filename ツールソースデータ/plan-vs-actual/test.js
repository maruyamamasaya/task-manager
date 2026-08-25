const assert = require("assert");
const { parseMarkdown, exportMarkdown, totals, formatDiff } = require("./app.js");

const source = `- [ ] 親タスク 【進捗: 30%】 （予：60分 / 実：20分）
  - [x] 子タスク メモは維持 （予： / 実：）
通常の文章`;
const tasks = parseMarkdown(source);
assert.strictEqual(tasks.length, 2);
assert.deepStrictEqual(tasks[0], { lineIndex: 0, indent: "", checked: false, content: "親タスク 【進捗: 30%】", title: "親タスク", progress: "【進捗: 30%】", plan: "60", actual: "20" });
assert.strictEqual(tasks[1].checked, true);
assert.strictEqual(tasks[1].indent, "  ");
tasks[0].actual = "80";
const output = exportMarkdown(source, tasks);
assert.ok(output.includes("- [ ] 親タスク 【進捗: 30%】 （予：60分 / 実：80分）"));
assert.ok(output.includes("  - [x] 子タスク メモは維持 （予： / 実：）"));
assert.ok(output.endsWith("通常の文章"));
assert.strictEqual((output.match(/予：60分/g) || []).length, 1);

const duplicate = "- [ ] A 【進捗: 0%】 （予：10分 / 実：5分） （予：20分 / 実：15分）";
const duplicateTasks = parseMarkdown(duplicate);
assert.strictEqual(duplicateTasks[0].plan, "20");
assert.strictEqual((exportMarkdown(duplicate, duplicateTasks).match(/（予：/g) || []).length, 1);
assert.deepStrictEqual(totals([{ plan: "60", actual: "45" }, { plan: "", actual: "15" }]), { plan: 60, actual: 60, diff: 0 });
assert.strictEqual(formatDiff(20), "+20分");
assert.strictEqual(formatDiff(-15), "−15分");
console.log("plan-vs-actual tests passed");
