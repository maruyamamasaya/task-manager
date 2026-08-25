const assert = require("node:assert/strict");
const { parseTasks, calculateOverall, evaluation, toMarkdown } = require("./app.js");
const tasks = parseTasks("- [ ] テスト 【進捗: 40%】\n  - [x] 完了\nメモ");
assert.deepEqual(tasks.map(({ name, depth, progress }) => ({ name, depth, progress })), [{ name: "テスト", depth: 0, progress: 40 }, { name: "完了", depth: 1, progress: 100 }, { name: "メモ", depth: 0, progress: 0 }]);
assert.equal(calculateOverall(tasks), 47);
assert.equal(evaluation(85).title, "ゴールは目前です");
assert.equal(toMarkdown(tasks), "- [ ] テスト 【進捗: 40%】\n  - [x] 完了 【進捗: 100%】\nメモ 【進捗: 0%】");
assert.deepEqual(parseTasks(toMarkdown(tasks)).map((task) => task.progress), [40, 100, 0]);

const estimated = parseTasks("- [ ] その他タスク 【進捗: 0%】 （予：120分 / 実：）");
estimated[0].progress = 50;
assert.equal(toMarkdown(estimated), "- [ ] その他タスク 【進捗: 50%】 （予：120分 / 実：）");
assert.equal((toMarkdown(estimated).match(/【進捗:/g) || []).length, 1);

const progressAfterEstimate = parseTasks("\t* [X] タスク （予：120分 / 実：30分） 補足 【進捗： 25 %】 末尾");
progressAfterEstimate[0].progress = 75;
assert.equal(toMarkdown(progressAfterEstimate), "\t* [X] タスク （予：120分 / 実：30分） 補足 【進捗: 75%】 末尾");

const noProgress = parseTasks("  + [ ] 名前 （予：10分 / 実：） その他");
noProgress[0].progress = 10;
assert.equal(toMarkdown(noProgress), "  + [ ] 名前 （予：10分 / 実：） その他 【進捗: 10%】");

const duplicated = parseTasks("- [ ] 名前 【進捗: 10%】 補足 【進捗: 20%】");
duplicated[0].progress = 30;
assert.equal((toMarkdown(duplicated).match(/【進捗:/g) || []).length, 1);
console.log("All Progress Tracker tests passed.");
