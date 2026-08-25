"use strict";

const SAMPLE = `- [ ] テスト 【進捗: 40%】
  - [ ] 新しいタスク 【進捗: 75%】
    - [ ] 新しいタスク 【進捗: 50%】
    - [ ] 新しいタスク 【進捗: 50%】
  - [ ] 新しいタスク 【進捗: 40%】
- [x] テスト 【進捗: 100%】
- [x] テスト 【進捗: 100%】`;

function parseChecklist(text) {
  const tasks = [];
  const ancestors = [];
  String(text).split(/\r?\n/).forEach((line) => {
    const match = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/);
    if (!match) return;
    const indent = match[1].replace(/\t/g, "  ").length;
    const rawTitle = match[3];
    const progressMatch = rawTitle.match(/【\s*進捗\s*[:：]\s*(\d{1,3})\s*%\s*】\s*$/);
    const progress = progressMatch ? Math.min(100, Number(progressMatch[1])) : (match[2].toLowerCase() === "x" ? 100 : 0);
    const title = (progressMatch ? rawTitle.slice(0, progressMatch.index) : rawTitle).trim();
    if (!title) return;
    while (ancestors.length && indent <= ancestors.at(-1).indent) ancestors.pop();
    const task = { title, checked: match[2].toLowerCase() === "x", progress, depth: ancestors.length, path: ancestors.map((item) => item.title), reflection: { done: "", missed: "", cause: "", next: "" } };
    tasks.push(task);
    ancestors.push({ indent, title });
  });
  return tasks;
}

function escapeMarkdown(value) {
  return String(value).replace(/([\\`*_{}\[\]<>])/g, "\\$1");
}

function generateMarkdown(tasks) {
  if (!tasks.length) return "";
  const labels = { done: "できたこと", missed: "できなかったこと", cause: "原因・気づき", next: "次回やること" };
  const lines = ["# 振り返り", ""];
  tasks.forEach((task) => {
    lines.push(`${"#".repeat(Math.min(task.depth + 2, 6))} ${escapeMarkdown(task.title)}（進捗: ${task.progress}%）`, "");
    Object.entries(labels).forEach(([key, label]) => {
      const value = task.reflection[key].trim();
      if (value) lines.push(`**${label}**`, "", value, "");
    });
    if (!Object.values(task.reflection).some((value) => value.trim())) lines.push("_振り返りを入力してください。_", "");
  });
  return lines.join("\n").trimEnd();
}

if (typeof document !== "undefined") {
  const source = document.querySelector("#sourceInput");
  const reflectionSection = document.querySelector("#reflectionSection");
  const outputSection = document.querySelector("#outputSection");
  const list = document.querySelector("#reflectionList");
  const output = document.querySelector("#markdownOutput");
  const error = document.querySelector("#inputError");
  let tasks = [];

  function updateOutput() { output.value = generateMarkdown(tasks); }
  function render() {
    list.replaceChildren();
    tasks.forEach((task, index) => {
      const card = document.querySelector("#reflectionTemplate").content.firstElementChild.cloneNode(true);
      card.style.setProperty("--depth", task.depth);
      card.querySelector(".task-number").textContent = String(index + 1).padStart(2, "0");
      const path = card.querySelector(".task-path");
      path.textContent = task.path.length ? task.path.join(" / ") : "大タスク";
      card.querySelector("h3").textContent = task.title;
      card.querySelector(".check-mark").textContent = task.checked ? "✓" : "";
      card.querySelector(".check-mark").classList.toggle("complete", task.checked);
      const pill = card.querySelector(".progress-pill");
      pill.textContent = `${task.progress}%`;
      pill.style.setProperty("--progress", `${task.progress}%`);
      card.querySelectorAll("textarea[data-field]").forEach((area) => area.addEventListener("input", () => {
        task.reflection[area.dataset.field] = area.value;
        updateOutput();
      }));
      list.append(card);
    });
    document.querySelector("#taskCount").textContent = `${tasks.length} タスク`;
    reflectionSection.hidden = false;
    outputSection.hidden = false;
    updateOutput();
  }

  document.querySelector("#sampleButton").addEventListener("click", () => { source.value = SAMPLE; source.focus(); error.textContent = ""; });
  document.querySelector("#buildButton").addEventListener("click", () => {
    const parsed = parseChecklist(source.value);
    if (!parsed.length) { error.textContent = "Markdownのチェックリストが見つかりませんでした。例: - [ ] タスク 【進捗: 40%】"; source.focus(); return; }
    error.textContent = ""; tasks = parsed; render(); reflectionSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#copyButton").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(output.value); }
    catch { output.select(); document.execCommand("copy"); }
    const status = document.querySelector("#copyStatus"); status.textContent = "Markdownをコピーしました";
    setTimeout(() => { status.textContent = ""; }, 2200);
  });
}

if (typeof module !== "undefined") module.exports = { parseChecklist, generateMarkdown, escapeMarkdown, SAMPLE };
