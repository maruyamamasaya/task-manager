(function () {
  "use strict";
  const STORAGE_KEY = "schedule-plotter.v1";
  const SLOT_HEIGHT = 48;
  const SAMPLE = `- [ ] 応用情報技術者試験勉強 【進捗: 0%】 （予：120分 / 実：）
  - [ ] 過去問を80問解く 【進捗: 0%】 （予：60分 / 実：）
- [ ] VMwareの調査、OpenShiftの使い方など 【進捗: 20%】 （予：180分 / 実：）
  - [ ] VMwareについて、説明ができるようになる 【進捗: 30%】 （予：60分 / 実：）
  - [ ] OpenShiftについて、どういうものかを説明できる 【進捗: 10%】 （予：90分 / 実：）
- [ ] その他タスク 【進捗: 0%】 （予：30分 / 実：）`;

  function parseTasks(markdown) {
    return String(markdown || "").split(/\r?\n/).map((line, index) => {
      const match = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/);
      if (!match) return null;
      const progress = match[3].match(/【\s*進捗\s*[:：]\s*(\d+)\s*%\s*】/);
      const estimate = match[3].match(/[（(]\s*予\s*[:：]\s*(\d+)\s*分/);
      const name = match[3]
        .replace(/【\s*進捗\s*[:：]\s*\d+\s*%\s*】/g, "")
        .replace(/[（(]\s*予\s*[:：][^）)]*[）)]/g, "").trim();
      return { id: `task-${index}`, name, depth: Math.floor(match[1].replace(/\t/g, "  ").length / 2), completed: match[2].toLowerCase() === "x", progress: progress ? Math.min(100, Number(progress[1])) : 0, estimate: estimate ? Number(estimate[1]) : 60 };
    }).filter(Boolean);
  }
  function toMinutes(value) { const [h, m] = value.split(":").map(Number); return h * 60 + m; }
  function toTime(minutes) { const value = Math.max(0, Math.min(1440, minutes)); return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
  function snap(minutes) { return Math.round(minutes / 5) * 5; }
  function getOverlaps(blocks) {
    const overlaps = [];
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const start = Math.max(blocks[i].start, blocks[j].start), end = Math.min(blocks[i].end, blocks[j].end);
      if (start < end) overlaps.push({ start, end, ids: [blocks[i].id, blocks[j].id] });
    }
    return overlaps;
  }
  function scheduleText(date, blocks, tasks, compact = false) {
    const lines = [...blocks].sort((a, b) => a.start - b.start).map(block => {
      const task = tasks.find(item => item.id === block.taskId);
      return compact ? `${toTime(block.start)}-${toTime(block.end)} ${task ? task.name : "不明なタスク"}` : `${toTime(block.start)} - ${toTime(block.end)}\n${task ? task.name : "不明なタスク"}`;
    });
    return compact ? lines.join("\n") : `## ${date.replaceAll("-", "/")} スケジュール\n\n${lines.join("\n\n")}`;
  }
  if (typeof module !== "undefined") { module.exports = { parseTasks, toMinutes, toTime, snap, getOverlaps, scheduleText }; return; }

  let state = load();
  let selectedDate = localDate(new Date());
  let editingId = null;
  let collapsed = new Set();
  const $ = selector => document.querySelector(selector);
  const timeline = $("#timeline");
  function load() { try { return { markdown: "", tasks: [], schedules: {}, settings: { start: 540, end: 1140 }, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch (_) { return { markdown: "", tasks: [], schedules: {}, settings: { start: 540, end: 1140 } }; } }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function localDate(date) { const offset = date.getTimezoneOffset() * 60000; return new Date(date - offset).toISOString().slice(0, 10); }
  function blocks() { return state.schedules[selectedDate] || (state.schedules[selectedDate] = []); }
  function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
  function formatDate(dateString) { return new Date(`${dateString}T00:00:00`).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }); }

  function render() { selectedDate = localDate(new Date()); $("#dateLabel").textContent = formatDate(selectedDate); renderTasks(); renderTimeline(); }
  function renderTasks() {
    const list = $("#taskList"), query = $("#taskSearch").value.toLowerCase(), showDone = $("#showCompleted").checked;
    list.replaceChildren();
    const visible = state.tasks.filter(task => (showDone || !task.completed) && task.name.toLowerCase().includes(query));
    state.tasks.forEach((task, index) => {
      if (!visible.includes(task)) return;
      const parent = state.tasks[index + 1] && state.tasks[index + 1].depth > task.depth;
      const hiddenByParent = state.tasks.slice(0, index).some((candidate, parentIndex) => collapsed.has(candidate.id) && candidate.depth < task.depth && !state.tasks.slice(parentIndex + 1, index).some(middle => middle.depth <= candidate.depth));
      if (hiddenByParent) return;
      const allocated = blocks().filter(block => block.taskId === task.id).reduce((sum, block) => sum + block.end - block.start, 0);
      const remaining = Math.max(0, task.estimate - allocated);
      const card = document.createElement("article");
      card.className = `task-card${task.depth ? " child" : ""}${task.completed ? " done" : ""}`;
      card.draggable = true; card.dataset.taskId = task.id;
      card.innerHTML = `<div class="task-title">${parent ? `<button class="collapse" aria-label="子タスクを開閉">${collapsed.has(task.id) ? "▶" : "▼"}</button>` : '<span class="grip">⠿</span>'}<span>${escapeHtml(task.name)}</span></div><div class="task-meta"><span>進捗 ${task.progress}%</span><span>予：${task.estimate}分</span></div><div class="task-balance"><i style="width:${Math.min(100, allocated / task.estimate * 100)}%"></i></div><p class="task-remaining">配置 ${allocated}分 ・ 残り ${remaining}分</p>`;
      card.addEventListener("dragstart", event => event.dataTransfer.setData("text/task-id", task.id));
      card.querySelector(".collapse")?.addEventListener("click", event => { event.preventDefault(); collapsed.has(task.id) ? collapsed.delete(task.id) : collapsed.add(task.id); renderTasks(); });
      list.append(card);
    });
    const placed = state.tasks.filter(task => blocks().some(block => block.taskId === task.id)).length;
    $("#taskCount").textContent = visible.length; $("#placedCount").textContent = placed; $("#unplacedCount").textContent = Math.max(0, state.tasks.filter(t => showDone || !t.completed).length - placed);
    $("#taskEmpty").style.display = state.tasks.length ? "none" : "grid";
  }
  function renderTimeline() {
    timeline.replaceChildren();
    const { start, end } = state.settings;
    timeline.style.height = `${(end - start) / 30 * SLOT_HEIGHT + 1}px`;
    for (let minute = start; minute <= end; minute += 60) {
      const row = document.createElement("div"); row.className = "time-row";
      row.innerHTML = `<div class="time-label">${toTime(minute)}</div><div class="slot"></div>`; timeline.append(row);
    }
    const overlapIds = new Set(getOverlaps(blocks()).flatMap(item => item.ids));
    blocks().forEach(block => {
      const task = state.tasks.find(item => item.id === block.taskId); if (!task) return;
      const el = document.createElement("article"); el.className = `schedule-block${overlapIds.has(block.id) ? " overlap" : ""}`;
      el.style.top = `${(block.start - start) / 30 * SLOT_HEIGHT + 1}px`; el.style.height = `${Math.max(8, (block.end - block.start) / 30 * SLOT_HEIGHT - 2)}px`;
      el.innerHTML = `<span class="resize-handle top"></span><div class="block-time">${toTime(block.start)}–${toTime(block.end)}</div><div class="block-name">${escapeHtml(task.name)}</div><button class="block-delete" aria-label="削除">×</button><span class="resize-handle bottom"></span>`;
      el.addEventListener("click", event => { if (!event.target.closest("button") && !event.target.classList.contains("resize-handle")) openEditor(block.id); });
      el.querySelector(".block-delete").addEventListener("click", () => removeBlock(block.id));
      pointerOperation(el, block);
      timeline.append(el);
    });
    renderWarnings(); renderNow();
  }
  function pointerOperation(el, block) {
    el.addEventListener("pointerdown", event => {
      if (event.target.closest("button")) return;
      const mode = event.target.classList.contains("top") ? "top" : event.target.classList.contains("bottom") ? "bottom" : "move";
      const originY = event.clientY, original = { start: block.start, end: block.end }; el.setPointerCapture(event.pointerId);
      el.onpointermove = move => { const delta = snap((move.clientY - originY) / SLOT_HEIGHT * 30); if (mode === "move") { const duration = original.end - original.start; block.start = Math.max(state.settings.start, Math.min(state.settings.end - duration, original.start + delta)); block.end = block.start + duration; } else if (mode === "top") block.start = Math.min(original.end - 5, Math.max(state.settings.start, original.start + delta)); else block.end = Math.max(original.start + 5, Math.min(state.settings.end, original.end + delta)); el.style.top = `${(block.start - state.settings.start) / 30 * SLOT_HEIGHT + 1}px`; el.style.height = `${Math.max(8, (block.end - block.start) / 30 * SLOT_HEIGHT - 2)}px`; el.querySelector(".block-time").textContent = `${toTime(block.start)}–${toTime(block.end)}`; };
      el.onpointerup = () => { el.onpointermove = null; save(); render(); };
    });
  }
  function renderWarnings() { const overlaps = getOverlaps(blocks()); $("#overlapWarnings").innerHTML = overlaps.map(item => `⚠ ${toTime(item.start)}〜${toTime(item.end)}で予定が重複しています`).join("<br>"); }
  function renderNow() { timeline.querySelector(".now-line")?.remove(); const today = localDate(new Date()), now = new Date(), minute = now.getHours() * 60 + now.getMinutes(); if (selectedDate !== today || minute < state.settings.start || minute > state.settings.end) return; const line = document.createElement("div"); line.className = "now-line"; line.style.top = `${(minute - state.settings.start) / 30 * SLOT_HEIGHT}px`; line.title = `現在 ${toTime(minute)}`; timeline.append(line); }
  function addBlock(taskId, start) { const task = state.tasks.find(item => item.id === taskId); if (!task) return; const clampedStart = Math.max(state.settings.start, Math.min(state.settings.end - 5, snap(start))); blocks().push({ id: uid(), taskId, start: clampedStart, end: Math.min(state.settings.end, clampedStart + Math.max(5, snap(task.estimate))) }); save(); render(); }
  function removeBlock(id) { state.schedules[selectedDate] = blocks().filter(block => block.id !== id); save(); render(); toast("配置を削除しました"); }
  function openEditor(id) { editingId = id; const block = blocks().find(item => item.id === id), task = state.tasks.find(item => item.id === block.taskId); $("#editTask").value = task.name; $("#editStart").value = toTime(block.start); $("#editEnd").value = toTime(block.end); $("#editEstimate").textContent = `${task.estimate}分（配置 ${block.end - block.start}分）`; $("#blockDialog").showModal(); }

  function copy(compact) { const text = scheduleText(selectedDate, blocks(), state.tasks, compact); navigator.clipboard.writeText(text).then(() => toast(compact ? "簡易形式をコピーしました" : "Markdownをコピーしました")).catch(() => toast("コピーできませんでした")); }
  function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 1800); }
  function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }

  timeline.addEventListener("dragover", event => event.preventDefault());
  timeline.addEventListener("drop", event => { event.preventDefault(); const taskId = event.dataTransfer.getData("text/task-id"); const rect = timeline.getBoundingClientRect(); addBlock(taskId, state.settings.start + (event.clientY - rect.top) / SLOT_HEIGHT * 30); });
  $("#openImport").onclick = () => { $("#markdownInput").value = state.markdown || SAMPLE; $("#importDialog").showModal(); };
  $("#importButton").onclick = () => { state.markdown = $("#markdownInput").value; state.tasks = parseTasks(state.markdown); save(); $("#importDialog").close(); render(); toast(`${state.tasks.length}件のタスクを読み込みました`); };
  function setTaskView(markdownMode) { $("#markdownEditor").hidden = !markdownMode; $("#taskListView").hidden = markdownMode; $("#showTaskList").classList.toggle("active", !markdownMode); $("#showMarkdownEditor").classList.toggle("active", markdownMode); $("#showTaskList").setAttribute("aria-selected", String(!markdownMode)); $("#showMarkdownEditor").setAttribute("aria-selected", String(markdownMode)); if (markdownMode) $("#taskMarkdown").value = state.markdown || ""; }
  $("#showTaskList").onclick = () => setTaskView(false);
  $("#showMarkdownEditor").onclick = () => setTaskView(true);
  $("#saveMarkdown").onclick = () => { state.markdown = $("#taskMarkdown").value; state.tasks = parseTasks(state.markdown); save(); setTaskView(false); render(); toast(`${state.tasks.length}件のタスクを反映しました`); };
  $("#openSettings").onclick = () => { $("#startHour").value = toTime(state.settings.start); $("#endHour").value = toTime(state.settings.end); $("#settingsDialog").showModal(); };
  $("#saveSettings").onclick = () => { const start = toMinutes($("#startHour").value), end = toMinutes($("#endHour").value); if (end - start < 60) return toast("終了は開始より1時間以上後にしてください"); state.settings = { start: snap(start), end: snap(end) }; save(); $("#settingsDialog").close(); render(); };
  $("#saveBlock").onclick = () => { const block = blocks().find(item => item.id === editingId), start = snap(toMinutes($("#editStart").value)), end = snap(toMinutes($("#editEnd").value)); if (end <= start) return toast("終了は開始より後にしてください"); block.start = start; block.end = end; save(); $("#blockDialog").close(); render(); };
  $("#deleteBlock").onclick = () => { $("#blockDialog").close(); removeBlock(editingId); };
  $("#taskSearch").oninput = renderTasks; $("#showCompleted").onchange = renderTasks;
  $("#copyMarkdown").onclick = () => copy(false); $("#copyCompact").onclick = () => copy(true);
  $("#clearSchedule").onclick = () => { if (blocks().length && confirm("この日のスケジュール配置をすべて削除しますか？")) { state.schedules[selectedDate] = []; save(); render(); toast("スケジュールをクリアしました"); } };
  render(); setInterval(renderNow, 60000);
}());
