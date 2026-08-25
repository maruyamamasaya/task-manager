import type { Reflection, Task } from "@/types/database";

type ReportMetrics = { planned: number; actual: number; difference: number };

export function reflectionReportMarkdown(task: Task, reflection: Reflection, projectName: string, metrics: ReportMetrics) {
  const completed = task.completed_at ? new Date(task.completed_at).toLocaleDateString("ja-JP") : "—";
  const value = (text: string | null) => text?.trim() || "—";
  return `# ${task.title}\n\n- Project: ${projectName}\n- 完了日: ${completed}\n- 予定: ${metrics.planned}分\n- 実績: ${metrics.actual}分\n- 差分: ${metrics.difference >= 0 ? "+" : ""}${metrics.difference}分\n\n## 結果\n${value(reflection.result)}\n\n## 良かった点\n${value(reflection.good_points)}\n\n## 課題\n${value(reflection.problems)}\n\n## 学び・改善\n${value(reflection.improvements)}\n\n## 次のアクション\n${value(reflection.next_action)}\n`;
}
