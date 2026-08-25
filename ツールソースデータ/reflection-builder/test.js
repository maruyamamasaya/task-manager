"use strict";
const assert = require("assert");
const { parseChecklist, generateMarkdown, escapeMarkdown, SAMPLE } = require("./app.js");

const tasks = parseChecklist(SAMPLE);
assert.strictEqual(tasks.length, 7);
assert.deepStrictEqual(tasks.map((task) => task.depth), [0, 1, 2, 2, 1, 0, 0]);
assert.strictEqual(tasks[0].progress, 40);
assert.strictEqual(tasks[1].path.join(" / "), "テスト");
assert.strictEqual(tasks[5].checked, true);
assert.strictEqual(parseChecklist("- [x] 完了")[0].progress, 100);
assert.strictEqual(parseChecklist("* [ ] 未完了")[0].progress, 0);
assert.strictEqual(parseChecklist("not a task").length, 0);
assert.strictEqual(parseChecklist("- [ ] 上限 【進捗: 120%】")[0].progress, 100);
assert.strictEqual(escapeMarkdown("[確認]*"), "\\[確認\\]\\*");

tasks[0].reflection.done = "テストを開始できた";
tasks[0].reflection.next = "残りを進める";
const markdown = generateMarkdown(tasks.slice(0, 2));
assert.match(markdown, /^# 振り返り/);
assert.match(markdown, /## テスト（進捗: 40%）/);
assert.match(markdown, /### 新しいタスク（進捗: 75%）/);
assert.match(markdown, /\*\*できたこと\*\*[\s\S]*テストを開始できた/);
assert.match(markdown, /\*\*次回やること\*\*[\s\S]*残りを進める/);
assert.match(markdown, /_振り返りを入力してください。_/);
assert.strictEqual(generateMarkdown([]), "");
console.log("reflection-builder tests passed");
