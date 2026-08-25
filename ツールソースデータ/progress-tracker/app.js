"use strict";

const PROGRESS_PATTERN = /【\s*進捗\s*[:：]\s*(\d{1,3})\s*%\s*】|\{\s*progress\s*[:=]\s*(\d{1,3})\s*%\s*\}|<!--\s*進捗\s*[:：]\s*(\d{1,3})\s*%\s*-->/gi;

function clampProgress(value) { return Math.max(0, Math.min(100, Number(value) || 0)); }

function parseTasks(text) {
  const tasks = [];
  String(text).split(/\r?\n/).forEach((raw, index) => {
    if (!raw.trim()) return;
    const checklist = raw.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/);
    const bullet = raw.match(/^(\s*)[-*+]\s+(.+?)\s*$/);
    let name; let depth = 0; let checked = false;
    if (checklist) {
      depth = Math.floor(checklist[1].replace(/\t/g, "  ").length / 2);
      checked = checklist[2].toLowerCase() === "x"; name = checklist[3];
    } else if (bullet) {
      depth = Math.floor(bullet[1].replace(/\t/g, "  ").length / 2); name = bullet[2];
    } else { name = raw.trim(); }
    const progressMatch = Array.from(name.matchAll(PROGRESS_PATTERN))[0];
    const progress = progressMatch ? clampProgress(progressMatch.slice(1).find((value) => value !== undefined)) : checked ? 100 : 0;
    if (progressMatch) name = name.replace(PROGRESS_PATTERN, "").trim();
    if (name) tasks.push({ id: `task-${index}-${tasks.length}`, name, depth: Math.min(depth, 8), progress, raw });
  });
  return tasks;
}

function calculateOverall(tasks) {
  if (!tasks.length) return 0;
  return Math.round(tasks.reduce((sum, task) => sum + clampProgress(task.progress), 0) / tasks.length);
}

function evaluation(percent) {
  if (percent === 100) return { title: "すべて完了です", detail: "おつかれさまでした。すべてのタスクが完了しています。" };
  if (percent >= 80) return { title: "ゴールは目前です", detail: "仕上げの段階です。残りのタスクを確認して完了させましょう。" };
  if (percent >= 50) return { title: "順調に進んでいます", detail: "半分を越えました。このペースで着実に進めましょう。" };
  if (percent > 0) return { title: "進捗が生まれています", detail: "良いスタートです。次に進めるタスクをひとつ選びましょう。" };
  return { title: "ここからスタート", detail: "各タスクの進捗率を入力すると、全体の状況が見えてきます。" };
}

function toMarkdown(tasks) {
  return tasks.map((task) => {
    const marker = `【進捗: ${clampProgress(task.progress)}%】`;
    if (typeof task.raw !== "string") return `${"  ".repeat(task.depth)}- [${clampProgress(task.progress) === 100 ? "x" : " "}] ${task.name} ${marker}`;

    let found = false;
    const line = task.raw.replace(PROGRESS_PATTERN, () => {
      if (found) return "";
      found = true;
      return marker;
    });
    return found ? line : `${line} ${marker}`;
  }).join("\n");
}

if (typeof document !== "undefined") {
  const input = document.querySelector("#taskInput");
  const list = document.querySelector("#taskList");
  const empty = document.querySelector("#emptyState");
  const output = document.querySelector("#markdownOutput");
  const overall = document.querySelector("#overallPercent");
  const ring = document.querySelector("#progressRing");
  const evaluationTitle = document.querySelector("#evaluationTitle");
  const evaluationDetail = document.querySelector("#evaluationDetail");
  const status = document.querySelector("#status");
  let tasks = [];

  function announce(message) { status.textContent = message; setTimeout(() => { status.textContent = ""; }, 1800); }
  function updateSummary() {
    const percent = calculateOverall(tasks); const copy = evaluation(percent);
    overall.textContent = `${percent}%`; ring.style.setProperty("--progress", `${percent * 3.6}deg`);
    ring.setAttribute("aria-valuenow", percent); evaluationTitle.textContent = copy.title; evaluationDetail.textContent = copy.detail;
    output.value = toMarkdown(tasks);
  }
  function render() {
    list.replaceChildren(); empty.hidden = tasks.length > 0;
    tasks.forEach((task, index) => {
      const row = document.createElement("div"); row.className = "task-row"; row.style.setProperty("--depth", task.depth);
      const name = document.createElement("div"); name.className = "task-name"; name.textContent = task.name;
      const controls = document.createElement("div"); controls.className = "progress-input";
      const range = document.createElement("input"); range.type = "range"; range.min = "0"; range.max = "100"; range.value = task.progress; range.setAttribute("aria-label", `${task.name}の進捗率`);
      const number = document.createElement("input"); number.type = "number"; number.min = "0"; number.max = "100"; number.value = task.progress; number.setAttribute("aria-label", `${task.name}の進捗率（数値）`);
      const suffix = document.createElement("span"); suffix.textContent = "%";
      const set = (value) => { task.progress = clampProgress(value); range.value = task.progress; number.value = task.progress; updateSummary(); };
      range.addEventListener("input", () => set(range.value)); number.addEventListener("input", () => set(number.value));
      controls.append(range, number, suffix); row.append(name, controls); list.append(row);
    });
    updateSummary();
  }
  document.querySelector("#loadButton").addEventListener("click", () => { tasks = parseTasks(input.value); render(); announce(tasks.length ? `${tasks.length}件のタスクを読み込みました` : "タスクが見つかりませんでした"); });
  document.querySelector("#sampleButton").addEventListener("click", () => { input.value = "- [ ] テスト\n  - [ ] 新しいタスク\n    - [ ] 新しいタスク\n    - [x] 新しいタスク\n  - [ ] 新しいタスク"; input.focus(); });
  document.querySelector("#copyButton").addEventListener("click", async () => {
    if (!output.value) return announce("コピーする結果がありません");
    try { await navigator.clipboard.writeText(output.value); } catch { output.select(); document.execCommand("copy"); }
    announce("進捗付きMarkdownをコピーしました");
  });
  render();
}

if (typeof module !== "undefined") module.exports = { clampProgress, parseTasks, calculateOverall, evaluation, toMarkdown };
