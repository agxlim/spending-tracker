// Streaks of under-pace days. Pure functions only.

import { monthStart, type ISODate } from "./dates";
import type { DailyStatus } from "./budget";

export interface Streaks {
  current: number;
  best: number;
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
  let noSpendThisMonth = 0;

  for (const day of days) {
    if (day.status === "future") continue;
    if (day.status === "under" || day.status === "nospend") {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    if (day.status === "nospend" && monthStart(day.date) === thisMonth) noSpendThisMonth += 1;
  }

  return { current: run, best, noSpendThisMonth };
}
