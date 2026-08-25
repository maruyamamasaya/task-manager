"use strict";

const STORAGE_KEY = "checklist-builder.tasks.v1";
let nextId = 1;

function makeTask(name, checked = false, children = []) {
  return { id: `task-${Date.now()}-${nextId++}`, name: String(name).trim(), checked: Boolean(checked), children };
}

function parsePlainText(text) {
  return String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((name) => makeTask(name));
}

function parseMarkdown(text) {
  const roots = [];
  const stack = [];
  String(text).split(/\r?\n/).forEach((line) => {
    const match = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/);
    if (!match) return;
    const spaces = match[1].replace(/\t/g, "  ").length;
    const requestedDepth = Math.floor(spaces / 2);
    const depth = Math.min(requestedDepth, 2, stack.length);
    const task = makeTask(match[3], match[2].toLowerCase() === "x");
    if (depth === 0) roots.push(task);
    else stack[depth - 1].children.push(task);
    stack[depth] = task;
    stack.length = depth + 1;
  });
  synchronizeTree(roots);
  return roots;
}

function synchronizeTask(task) {
  task.children.forEach(synchronizeTask);
  if (task.children.length) task.checked = task.children.every((child) => child.checked);
  return task.checked;
}

function synchronizeTree(tasks) { tasks.forEach(synchronizeTask); }

function setTaskChecked(task, checked) {
  task.checked = checked;
  task.children.forEach((child) => setTaskChecked(child, checked));
}

function taskState(task) {
  if (!task.children.length) return { checked: task.checked, indeterminate: false };
  const states = task.children.map(taskState);
  const all = states.every((state) => state.checked);
  const some = states.some((state) => state.checked || state.indeterminate);
  return { checked: all, indeterminate: some && !all };
}

function toMarkdown(tasks, depth = 0) {
  return tasks.map((task) => `${"  ".repeat(depth)}- [${task.checked ? "x" : " "}] ${task.name}\n${toMarkdown(task.children, depth + 1)}`).join("");
}

function countTasks(tasks) {
  return tasks.reduce((count, task) => {
    const children = countTasks(task.children);
    return { total: count.total + 1 + children.total, completed: count.completed + Number(task.checked) + children.completed };
  }, { total: 0, completed: 0 });
}

function findTask(tasks, id) {
  for (const task of tasks) {
    if (task.id === id) return task;
    const child = findTask(task.children, id);
    if (child) return child;
  }
  return null;
}

function removeTask(tasks, id) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index >= 0) { tasks.splice(index, 1); return true; }
  return tasks.some((task) => removeTask(task.children, id));
}

function findTaskList(tasks, id) {
  if (tasks.some((task) => task.id === id)) return tasks;
  for (const task of tasks) {
    const list = findTaskList(task.children, id);
    if (list) return list;
  }
  return null;
}

if (typeof document !== "undefined") {
  const elements = {
    list: document.querySelector("#list"), empty: document.querySelector("#emptyState"), template: document.querySelector("#taskTemplate"),
    dialog: document.querySelector("#importDialog"), input: document.querySelector("#taskInput"), inputLabel: document.querySelector("#inputLabel"), hint: document.querySelector("#inputHint"),
    plainTab: document.querySelector("#plainTab"), markdownTab: document.querySelector("#markdownTab"), status: document.querySelector("#status"),
    progressText: document.querySelector("#progressText"), progressPercent: document.querySelector("#progressPercent"), progressBar: document.querySelector("#progressBar"), track: document.querySelector(".progress-track"),
    addTaskDialog: document.querySelector("#addTaskDialog"), addSiblingChoice: document.querySelector("#addSiblingChoice"), addChildChoice: document.querySelector("#addChildChoice")
  };
  let tasks = loadTasks();
  let inputMode = "plain";
  let statusTimer;
  let choiceTask = null;

  function loadTasks() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
  function announce(message) { clearTimeout(statusTimer); elements.status.textContent = message; statusTimer = setTimeout(() => { elements.status.textContent = ""; }, 2200); }

  function addChild(task) {
    const child = makeTask("新しいタスク"); task.children.push(child); task.checked = false; commit();
    requestAnimationFrame(() => startEditing(document.querySelector(`[data-id="${child.id}"]`)));
  }

  function addSibling(task) {
    const siblings = findTaskList(tasks, task.id);
    if (!siblings) return;
    const sibling = makeTask("新しいタスク");
    siblings.splice(siblings.indexOf(task) + 1, 0, sibling); commit();
    requestAnimationFrame(() => startEditing(document.querySelector(`[data-id="${sibling.id}"]`)));
  }

  function openAddTaskDialog(task) { choiceTask = task; elements.addTaskDialog.showModal(); elements.addSiblingChoice.focus(); }
  function closeAddTaskDialog() { elements.addTaskDialog.close(); choiceTask = null; }

  function renderTask(task, depth) {
    const node = document.createElement("div");
    node.className = `task-node${task.checked ? " completed" : ""}`;
    node.dataset.id = task.id; node.dataset.depth = depth; node.style.setProperty("--depth", depth);
    node.append(elements.template.content.cloneNode(true));
    const checkbox = node.querySelector(".task-check");
    const state = taskState(task);
    checkbox.checked = state.checked; checkbox.indeterminate = state.indeterminate;
    checkbox.setAttribute("aria-label", `${task.name}を${task.checked ? "未完了" : "完了"}にする`);
    node.querySelector(".task-name").textContent = task.name;
    const edit = node.querySelector(".task-edit"); edit.value = task.name;
    checkbox.addEventListener("change", () => { setTaskChecked(task, checkbox.checked); synchronizeTree(tasks); commit(); });
    const addButton = node.querySelector(".add-child");
    if (depth === 2) { addButton.setAttribute("aria-label", "同じ階層に小タスクを追加"); addButton.title = "小タスクを追加"; }
    addButton.addEventListener("click", (event) => {
      if (depth === 2 || event.shiftKey) { addSibling(task); return; }
      if (depth === 1 && matchMedia("(pointer: coarse)").matches) { openAddTaskDialog(task); return; }
      addChild(task);
    });
    node.querySelector(".edit-task").addEventListener("click", () => startEditing(node));
    node.querySelector(".delete-task").addEventListener("click", () => {
      if (task.children.length && !confirm(`「${task.name}」と子タスクを削除しますか？`)) return;
      removeTask(tasks, task.id); synchronizeTree(tasks); commit(); announce("タスクを削除しました");
    });
    edit.addEventListener("keydown", (event) => { if (event.key === "Enter") finishEditing(node, task); if (event.key === "Escape") { edit.value = task.name; node.classList.remove("editing"); } });
    edit.addEventListener("blur", () => { if (node.classList.contains("editing")) finishEditing(node, task); });
    if (task.children.length) {
      const children = document.createElement("div"); children.className = "task-children";
      task.children.forEach((child) => children.append(renderTask(child, depth + 1))); node.append(children);
    }
    return node;
  }

  function startEditing(node) { node.classList.add("editing"); const input = node.querySelector(".task-edit"); input.focus(); input.select(); }
  function finishEditing(node, task) { const input = node.querySelector(".task-edit"); const name = input.value.trim(); if (name) task.name = name; else input.value = task.name; node.classList.remove("editing"); commit(); }

  function render() {
    elements.list.replaceChildren(...tasks.map((task) => renderTask(task, 0)));
    const empty = tasks.length === 0; elements.empty.hidden = !empty; elements.list.hidden = empty;
    const counts = countTasks(tasks); const percent = counts.total ? Math.round(counts.completed / counts.total * 100) : 0;
    elements.progressText.textContent = `${counts.completed} / ${counts.total} 完了`; elements.progressPercent.textContent = `${percent}%`;
    elements.progressBar.style.width = `${percent}%`; elements.track.setAttribute("aria-valuenow", percent);
  }
  function commit() { save(); render(); }

  function openDialog() { elements.dialog.showModal(); elements.input.focus(); }
  function setMode(mode) {
    inputMode = mode; const markdown = mode === "markdown";
    elements.plainTab.classList.toggle("active", !markdown); elements.markdownTab.classList.toggle("active", markdown);
    elements.plainTab.setAttribute("aria-selected", !markdown); elements.markdownTab.setAttribute("aria-selected", markdown);
    elements.inputLabel.textContent = markdown ? "Markdownチェックリストを貼り付け" : "1行に1つ、大タスクを入力";
    elements.input.placeholder = markdown ? "- [ ] AWS学習\n  - [ ] EC2\n    - [x] インスタンス作成" : "AWS学習\nOpenShift学習\n応用情報勉強";
    elements.hint.textContent = markdown ? "2スペースごとのインデントを階層として、3階層まで読み込みます。" : "空の行は読み飛ばします。";
  }
  document.querySelector("#importButton").addEventListener("click", openDialog);
  document.querySelector("#emptyCreateButton").addEventListener("click", openDialog);
  elements.plainTab.addEventListener("click", () => setMode("plain")); elements.markdownTab.addEventListener("click", () => setMode("markdown"));
  document.querySelector("#createButton").addEventListener("click", () => {
    const created = inputMode === "markdown" ? parseMarkdown(elements.input.value) : parsePlainText(elements.input.value);
    if (!created.length) { elements.input.focus(); return; }
    tasks.push(...created); synchronizeTree(tasks); elements.input.value = ""; elements.dialog.close(); commit(); announce(`${created.length}件の大タスクを追加しました`);
  });
  document.querySelector("#addRootButton").addEventListener("click", () => { const task = makeTask("新しい大タスク"); tasks.push(task); commit(); requestAnimationFrame(() => startEditing(document.querySelector(`[data-id="${task.id}"]`))); });
  document.querySelector("#closeAddTaskDialog").addEventListener("click", closeAddTaskDialog);
  elements.addSiblingChoice.addEventListener("click", () => { const task = choiceTask; closeAddTaskDialog(); if (task) addSibling(task); });
  elements.addChildChoice.addEventListener("click", () => { const task = choiceTask; closeAddTaskDialog(); if (task) addChild(task); });
  document.querySelector("#resetButton").addEventListener("click", () => { if (!tasks.length || !confirm("チェックリストをすべて削除しますか？")) return; tasks = []; commit(); announce("すべて削除しました"); });
  document.querySelector("#copyButton").addEventListener("click", async () => {
    const markdown = toMarkdown(tasks).trimEnd(); if (!markdown) { announce("コピーするタスクがありません"); return; }
    try { await navigator.clipboard.writeText(markdown); } catch { const area = document.createElement("textarea"); area.value = markdown; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); }
    announce("Markdownをコピーしました");
  });
  render();
}

if (typeof module !== "undefined") module.exports = { makeTask, parsePlainText, parseMarkdown, synchronizeTree, setTaskChecked, taskState, toMarkdown, countTasks, findTask, removeTask, findTaskList };
