// Everything the dashboard shows, derived from budgets and transactions.
// Pure, so the client can recompute it instantly for optimistic quick-adds.

import { budgetForMonth, dailyStatusHistory, safeToSpendToday, spentInRange, type Budget, type Txn } from "./budget";
import { dayOfMonth, daysInMonth, monthEnd, monthStart, type ISODate } from "./dates";
import type { Cents } from "./money";
import { streaks, type Streaks } from "./streaks";

export interface DashboardSummary {
  budgetCents: Cents;
  safeToSpendCents: Cents; // today's allowance
  spentTodayCents: Cents; // regular spending today
  leftTodayCents: Cents; // allowance − spent today; negative when over
  spentThisMonthCents: Cents; // everything dated this month, one-offs included
  oneOffsThisMonthCents: Cents;
  remainingThisMonthCents: Cents; // budget − spent this month; negative when over
  daysLeft: number; // including today
  pacePercent: number; // share of the month elapsed by the end of today, 0–100
  streaks: Streaks;
}

/** `txns` must cover `firstActiveDay`'s month through the end of `today`'s month. */
export function dashboardSummary(
  budgets: Budget[],
  txns: Txn[],
  firstActiveDay: ISODate,
  today: ISODate,
): DashboardSummary | null {
  const budget = budgetForMonth(budgets, today);
  if (budget === null) return null;

  const regular = txns.filter((t) => !t.isOneOff);
  const oneOffs = txns.filter((t) => t.isOneOff);
  const start = monthStart(today);
  const end = monthEnd(today);

  const safeToSpend = safeToSpendToday(budget, txns, today);
  const spentToday = spentInRange(regular, today, today);
  const spentThisMonth = spentInRange(txns, start, end);
  const totalDays = daysInMonth(today);

  return {
    budgetCents: budget,
    safeToSpendCents: safeToSpend,
    spentTodayCents: spentToday,
    leftTodayCents: safeToSpend - spentToday,
    spentThisMonthCents: spentThisMonth,
    oneOffsThisMonthCents: spentInRange(oneOffs, start, end),
    remainingThisMonthCents: budget - spentThisMonth,
    daysLeft: totalDays - dayOfMonth(today) + 1,
    pacePercent: (dayOfMonth(today) / totalDays) * 100,
    streaks: streaks(dailyStatusHistory(budgets, txns, firstActiveDay, today), today),
  };
}
