const assert = require("node:assert/strict");
const { parsePlainText, parseMarkdown, synchronizeTree, setTaskChecked, taskState, toMarkdown, countTasks, removeTask, findTaskList } = require("./app.js");

const plain = parsePlainText("AWS学習\n\n OpenShift学習 \n");
assert.deepEqual(plain.map((task) => task.name), ["AWS学習", "OpenShift学習"]);

const markdown = parseMarkdown("- [ ] AWS学習\n  - [ ] EC2\n    - [x] インスタンス作成\n    - [ ] SG設定\n  - [x] S3");
assert.equal(markdown.length, 1);
assert.equal(markdown[0].children[0].children.length, 2);
assert.equal(markdown[0].children[1].checked, true);
assert.deepEqual(taskState(markdown[0]), { checked: false, indeterminate: true });
assert.equal(toMarkdown(markdown).trim(), "- [ ] AWS学習\n  - [ ] EC2\n    - [x] インスタンス作成\n    - [ ] SG設定\n  - [x] S3");

setTaskChecked(markdown[0].children[0], true);
synchronizeTree(markdown);
assert.equal(markdown[0].checked, true);
assert.deepEqual(countTasks(markdown), { total: 5, completed: 5 });
assert.equal(removeTask(markdown, markdown[0].children[1].id), true);
assert.equal(markdown[0].children.length, 1);
assert.equal(findTaskList(markdown, markdown[0].children[0].id), markdown[0].children);
assert.equal(findTaskList(markdown, "missing-task"), null);

console.log("All Checklist Builder tests passed.");
