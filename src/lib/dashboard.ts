// Everything the dashboard shows, derived from budgets and transactions.
// Pure, so the client can recompute it instantly for optimistic quick-adds.

import {
  budgetRowForMonth,
  dailyStatusHistory,
  paceBudgetForMonth,
  safeToSpendToday,
  savingsRateBps,
  spentInRange,
  type Budget,
  type DailyStatus,
  type Txn,
} from "./budget";
import { dayOfMonth, daysInMonth, monthEnd, monthStart, type ISODate } from "./dates";
import type { Cents } from "./money";
import { streaks, type Streaks } from "./streaks";

export interface DashboardSummary {
  budgetCents: Cents;
  safeToSpendCents: Cents; // today's allowance
  savingsRateBps: number;
  streakTargetCents: Cents; // today's allowance from the budget minus the savings goal
  spentTodayCents: Cents; // regular spending today
  leftTodayCents: Cents; // allowance − spent today; negative when over
  spentThisMonthCents: Cents; // everything dated this month, one-offs included
  oneOffsThisMonthCents: Cents;
  remainingThisMonthCents: Cents; // budget − spent this month; negative when over
  daysLeft: number; // including today
  pacePercent: number; // share of the month elapsed by the end of today, 0–100
  incomeCents: Cents | null; // monthly income, when set
  savingsRateSoFarBps: number | null; // (income − spent this month) ÷ income; null without income
  plannedSavingsRateBps: number | null; // (income − budget) ÷ income: the rate if the whole budget is spent
  streaks: Streaks;
  recentDays: DailyStatus[]; // the last finished days (up to 7), oldest first, judged against the streak target
  monthDays: DailyStatus[]; // every day of today's month, judged against the streak target
}

/** How many finished days the streak card lists one by one. */
export const RECENT_DAYS = 7;

/** `txns` must cover `firstActiveDay`'s month through the end of `today`'s month. */
export function dashboardSummary(
  budgets: Budget[],
  txns: Txn[],
  firstActiveDay: ISODate,
  today: ISODate,
): DashboardSummary | null {
  const row = budgetRowForMonth(budgets, today);
  const paceBudget = paceBudgetForMonth(budgets, today);
  if (row === null || paceBudget === null) return null;
  const budget = row.amountCents;

  const regular = txns.filter((t) => !t.isOneOff);
  const oneOffs = txns.filter((t) => t.isOneOff);
  const start = monthStart(today);
  const end = monthEnd(today);

  const safeToSpend = safeToSpendToday(budget, txns, today);
  const spentToday = spentInRange(regular, today, today);
  const spentThisMonth = spentInRange(txns, start, end);
  const totalDays = daysInMonth(today);
  const history = dailyStatusHistory(budgets, txns, firstActiveDay, today);
  const income = row.incomeCents ?? null;

  return {
    budgetCents: budget,
    safeToSpendCents: safeToSpend,
    savingsRateBps: row.savingsRateBps ?? 0,
    streakTargetCents: safeToSpendToday(paceBudget, txns, today),
    spentTodayCents: spentToday,
    leftTodayCents: safeToSpend - spentToday,
    spentThisMonthCents: spentThisMonth,
    oneOffsThisMonthCents: spentInRange(oneOffs, start, end),
    remainingThisMonthCents: budget - spentThisMonth,
    daysLeft: totalDays - dayOfMonth(today) + 1,
    pacePercent: (dayOfMonth(today) / totalDays) * 100,
    incomeCents: income,
    savingsRateSoFarBps: income === null ? null : savingsRateBps(income, spentThisMonth),
    plannedSavingsRateBps: income === null ? null : savingsRateBps(income, budget),
    streaks: streaks(history, today),
    recentDays: history.filter((d) => d.date < today && d.status !== "inactive").slice(-RECENT_DAYS),
    monthDays: history.filter((d) => d.date >= start),
  };
}
