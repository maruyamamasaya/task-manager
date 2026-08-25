(function () {
  "use strict";

  const STORAGE_KEY = "plan-vs-actual-manager:v1";
  const TIMING_RE = /[（(]\s*予\s*：\s*([^/）)]*?)\s*\/\s*実\s*：\s*([^）)]*?)\s*[）)]/g;
  const TASK_RE = /^(\s*)-\s+\[([ xX])\]\s*(.*)$/;

  function minutes(value) {
    const match = String(value || "").match(/\d+/);
    return match ? String(Math.max(0, parseInt(match[0], 10))) : "";
  }

  function parseMarkdown(markdown) {
    const tasks = [];
    String(markdown || "").split("\n").forEach((line, lineIndex) => {
      const match = line.match(TASK_RE);
      if (!match) return;
      const timings = [...match[3].matchAll(TIMING_RE)];
      const cleanContent = match[3].replace(TIMING_RE, "").trimEnd();
      const lastTiming = timings[timings.length - 1];
      const progress = cleanContent.match(/【進捗:\s*[^】]+】/);
      tasks.push({
        lineIndex,
        indent: match[1],
        checked: match[2].toLowerCase() === "x",
        content: cleanContent,
        title: cleanContent.replace(/【進捗:\s*[^】]+】/g, "").trim(),
        progress: progress ? progress[0] : "",
        plan: lastTiming ? minutes(lastTiming[1]) : "",
        actual: lastTiming ? minutes(lastTiming[2]) : ""
      });
    });
    return tasks;
  }

  function exportMarkdown(markdown, tasks) {
    const byLine = new Map(tasks.map((task) => [task.lineIndex, task]));
    return String(markdown || "").split("\n").map((line, index) => {
      const task = byLine.get(index);
      if (!task) return line;
      const cleanLine = line.replace(TIMING_RE, "").trimEnd();
      const plan = task.plan === "" ? "" : `${minutes(task.plan)}分`;
      const actual = task.actual === "" ? "" : `${minutes(task.actual)}分`;
      return `${cleanLine} （予：${plan} / 実：${actual}）`;
    }).join("\n");
  }

  function totals(tasks) {
    const plan = tasks.reduce((sum, task) => sum + (Number(task.plan) || 0), 0);
    const actual = tasks.reduce((sum, task) => sum + (Number(task.actual) || 0), 0);
    return { plan, actual, diff: actual - plan };
  }

  function formatDiff(diff) {
    return `${diff > 0 ? "+" : diff < 0 ? "−" : "±"}${Math.abs(diff)}分`;
  }

  if (typeof module !== "undefined") module.exports = { parseMarkdown, exportMarkdown, totals, formatDiff, minutes };
  if (typeof document === "undefined") return;

  const $ = (id) => document.getElementById(id);
  const input = $("markdown-input");
  const taskList = $("task-list");
  let tasks = [];

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ markdown: input.value, tasks, updatedAt: new Date().toISOString() }));
    $("save-status").textContent = `自動保存済み ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function renderSummary() {
    const total = totals(tasks);
    $("plan-total").textContent = total.plan;
    $("actual-total").textContent = total.actual;
    $("total-diff").textContent = formatDiff(total.diff);
    $("total-diff-card").className = total.diff > 0 ? "over" : total.diff < 0 ? "under" : "";
  }

  function renderTasks() {
    taskList.replaceChildren();
    tasks.forEach((task, index) => {
      const card = document.createElement("article");
      card.className = "task-card";
      card.style.setProperty("--depth", Math.min(Math.floor(task.indent.replace(/\t/g, "  ").length / 2), 6));
      card.innerHTML = `<div class="task-heading"><span class="check ${task.checked ? "checked" : ""}">${task.checked ? "✓" : ""}</span><div><h3></h3>${task.progress ? `<span class="progress"></span>` : ""}</div></div>
        <div class="time-grid">
          <label>予定<div class="number-field"><input type="number" min="0" step="1" inputmode="numeric" data-field="plan" aria-label="${index + 1}番目のタスクの予定時間"><span>分</span></div></label>
          <label>実績<div class="number-field"><input type="number" min="0" step="1" inputmode="numeric" data-field="actual" aria-label="${index + 1}番目のタスクの実績時間"><span>分</span></div></label>
          <div class="quick" aria-label="実績時間を追加"><small>実績に追加</small><button type="button" data-add="15">+15</button><button type="button" data-add="30">+30</button><button type="button" data-add="60">+60</button></div>
          <div class="diff"><small>差分</small><strong></strong></div>
        </div>`;
      card.querySelector("h3").textContent = task.title || "（名称なし）";
      const progress = card.querySelector(".progress");
      if (progress) progress.textContent = task.progress;
      card.querySelector('[data-field="plan"]').value = task.plan;
      card.querySelector('[data-field="actual"]').value = task.actual;
      updateCardDiff(card, task);
      card.addEventListener("input", (event) => {
        if (!event.target.dataset.field) return;
        task[event.target.dataset.field] = minutes(event.target.value);
        updateCardDiff(card, task); renderSummary(); save();
      });
      card.addEventListener("click", (event) => {
        if (!event.target.dataset.add) return;
        task.actual = String((Number(task.actual) || 0) + Number(event.target.dataset.add));
        card.querySelector('[data-field="actual"]').value = task.actual;
        updateCardDiff(card, task); renderSummary(); save();
      });
      taskList.append(card);
    });
    $("task-count").textContent = `${tasks.length}件のタスク`;
    renderSummary();
  }

  function updateCardDiff(card, task) {
    const value = (Number(task.actual) || 0) - (Number(task.plan) || 0);
    const el = card.querySelector(".diff");
    el.className = `diff ${value > 0 ? "over" : value < 0 ? "under" : ""}`;
    el.querySelector("strong").textContent = formatDiff(value);
  }

  function loadMarkdown() {
    tasks = parseMarkdown(input.value);
    $("parse-message").hidden = tasks.length > 0;
    $("parse-message").textContent = tasks.length ? "" : "Markdown形式のタスク（- [ ] または - [x]）が見つかりませんでした。";
    $("editor-section").hidden = tasks.length === 0;
    $("output-section").hidden = true;
    if (tasks.length) renderTasks();
    save();
  }

  $("load-button").addEventListener("click", loadMarkdown);
  input.addEventListener("input", save);
  $("export-button").addEventListener("click", () => {
    const output = exportMarkdown(input.value, tasks);
    $("markdown-output").value = output;
    $("output-section").hidden = false;
    $("output-section").scrollIntoView({ behavior: "smooth", block: "start" });
    save();
  });
  $("copy-button").addEventListener("click", async () => {
    const output = $("markdown-output");
    try { await navigator.clipboard.writeText(output.value); }
    catch (_) { output.select(); document.execCommand("copy"); }
    $("copy-status").textContent = "コピーしました";
  });
  $("clear-button").addEventListener("click", () => {
    if (!confirm("入力内容と保存データをすべて削除しますか？")) return;
    localStorage.removeItem(STORAGE_KEY); input.value = ""; tasks = [];
    $("editor-section").hidden = true; $("output-section").hidden = true;
    $("save-status").textContent = "データを削除しました";
  });

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved.markdown === "string") {
      input.value = saved.markdown;
      tasks = Array.isArray(saved.tasks) ? saved.tasks : parseMarkdown(saved.markdown);
      if (tasks.length) { $("editor-section").hidden = false; renderTasks(); }
      if (saved.updatedAt) $("save-status").textContent = `前回の編集を復元しました ${new Date(saved.updatedAt).toLocaleString("ja-JP")}`;
    }
  } catch (_) { localStorage.removeItem(STORAGE_KEY); }
}());
