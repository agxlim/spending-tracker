// Streaks of under-pace days. Pure functions only.

import { monthStart, type ISODate } from "./dates";
import type { DailyStatus } from "./budget";

export interface Streaks {
  current: number;
  best: number;
  underThisMonth: number; // finished days this month with some spending, under pace
  overThisMonth: number;
  noSpendThisMonth: number;
}

/**
 * `days` must be consecutive and in date order, possibly spanning months.
 * Under-pace and no-spend days extend a streak; an over-pace or inactive day
 * breaks it. Future days (including today) are ignored.
 */
export function streaks(days: DailyStatus[], today: ISODate): Streaks {
  const thisMonth = monthStart(today);
  let run = 0;
  let best = 0;
  let underThisMonth = 0;
  let overThisMonth = 0;
  let noSpendThisMonth = 0;

  for (const day of days) {
    if (day.status === "future") continue;
    if (day.status === "under" || day.status === "nospend") {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    if (monthStart(day.date) !== thisMonth) continue;
    if (day.status === "under") underThisMonth += 1;
    else if (day.status === "over") overThisMonth += 1;
    else if (day.status === "nospend") noSpendThisMonth += 1;
  }

  return { current: run, best, underThisMonth, overThisMonth, noSpendThisMonth };
}
