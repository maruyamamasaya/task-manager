import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { DaySchedule } from "@/components/schedule/day-schedule";
import { ScheduleCalendar } from "@/components/schedule/schedule-calendar";
import { createClient } from "@/lib/supabase/server";
import { tokyoDateKey, tokyoDayBounds } from "@/lib/time/phase3";

type View = "month" | "week" | "day";
const shift = (date: string, view: View, direction: number) => {
  const d = new Date(`${date}T00:00:00+09:00`);
  if (view === "month") d.setUTCMonth(d.getUTCMonth() + direction);
  else d.setUTCDate(d.getUTCDate() + direction * (view === "week" ? 7 : 1));
  return tokyoDateKey(d);
};
function range(date: string, view: View) {
  if (view === "day") return tokyoDayBounds(date);
  const d = new Date(`${date}T00:00:00+09:00`);
  if (view === "month") d.setUTCDate(1);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  const length = view === "month" ? 42 : 7;
  return {
    start: d.toISOString(),
    end: new Date(d.getTime() + length * 86400000).toISOString(),
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const params = await searchParams,
    date = params.date ?? tokyoDateKey(new Date()),
    view = (
      ["month", "week", "day"].includes(params.view ?? "") ? params.view : "day"
    ) as View,
    bounds = range(date, view),
    db = await createClient();
  const offStart = tokyoDateKey(bounds.start),
    offEnd = tokyoDateKey(new Date(new Date(bounds.end).getTime() - 1));
  const [
    { data: tasks },
    { data: projects },
    { data: schedules, error },
    { data: meetings, error: meetingError },
    { data: logs },
    { data: dayOffs, error: dayOffError },
  ] = await Promise.all([
    db
      .from("tasks")
      .select("*")
      .order("due_at", { ascending: true, nullsFirst: false }),
    db.from("projects").select("*").eq("archived", false).order("name"),
    db
      .from("task_schedules")
      .select("*")
      .gte("start_at", bounds.start)
      .lt("start_at", bounds.end)
      .order("start_at"),
    db.from("meetings").select("*").gte("start_at", bounds.start).lt("start_at", bounds.end).order("start_at"),
    view === "day"
      ? db
          .from("work_logs")
          .select("*")
          .gte("started_at", bounds.start)
          .lt("started_at", bounds.end)
      : Promise.resolve({ data: [] }),
    db
      .from("day_offs")
      .select("*")
      .gte("off_date", offStart)
      .lte("off_date", offEnd),
  ]);
  if (error || meetingError || dayOffError) throw error ?? meetingError ?? dayOffError;
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(`${date}T00:00:00+09:00`));
  const label =
    view === "month"
      ? `${date.slice(0, 4)}年 ${Number(date.slice(5, 7))}月`
      : view === "week"
        ? `${date.replaceAll("-", "/")} の週`
        : `${date.replaceAll("-", "/")}（${weekday}）`;
  return (
    <>
      <PageHeader
        title="Schedule"
        description="月・週・日の階層で、予定の密度から時間割まで確認できます。"
      />
      <div className="schedule-view-tabs">
        {(
          [
            ["month", "月"],
            ["week", "週"],
            ["day", "日"],
          ] as const
        ).map(([key, text]) => (
          <Link
            key={key}
            className={view === key ? "active" : ""}
            href={`/schedule?view=${key}&date=${date}`}
          >
            {text}
          </Link>
        ))}
      </div>
      <div className="schedule-date-controls">
        <Link className="schedule-today-button" href={`/schedule?view=${view}`}>
          今日
        </Link>
        <nav className="schedule-date-nav">
          <Link
            href={`/schedule?view=${view}&date=${shift(date, view, -1)}`}
            aria-label="前へ"
          >
            ←
          </Link>
          <b>{label}</b>
          <Link
            href={`/schedule?view=${view}&date=${shift(date, view, 1)}`}
            aria-label="次へ"
          >
            →
          </Link>
        </nav>
      </div>
      {view === "day" ? (
        <DaySchedule
          date={date}
          tasks={(tasks ?? []).filter(
            (t) =>
              !(tasks ?? []).some((child) => child.parent_id === t.id),
          )}
          projects={projects ?? []}
          schedules={schedules ?? []}
          meetings={meetings ?? []}
          logs={logs ?? []}
          dayOff={dayOffs?.[0]}
        />
      ) : (
        <ScheduleCalendar
          view={view}
          date={date}
          tasks={tasks ?? []}
          schedules={schedules ?? []}
          meetings={meetings ?? []}
          dayOffs={dayOffs ?? []}
        />
      )}
    </>
  );
}
