import { tokyoDateKey } from "./phase3";

export function calendarWeekday(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addCalendarDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return tokyoDateKey(date);
}

export function calendarWeekStart(dateKey: string) {
  return addCalendarDays(dateKey, -calendarWeekday(dateKey));
}
