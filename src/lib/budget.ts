// Budget math, computed on read from transactions. Pure functions only.

import {
  addDays,
  addMonths,
  dayOfMonth,
  daysInMonth,
  eachDay,
  monthEnd,
  monthStart,
  type ISODate,
} from "./dates";
import type { Cents } from "./money";

export interface Budget {
  effectiveMonth: ISODate; // first day of the month the amount starts applying
  amountCents: Cents;
  savingsRateBps?: number; // share of the budget to keep unspent, in basis points; 0 when absent
}

/** A savings goal can keep at most 90% of the budget unspent. */
export const MAX_SAVINGS_RATE_BPS = 9000;

export interface Txn {
  occurredOn: ISODate;
  amountCents: Cents; // positive = spend, negative = refund
  isOneOff: boolean;
}

export type DayStatus = "under" | "over" | "nospend" | "future" | "inactive";

export interface DailyStatus {
  date: ISODate;
  spent: Cents; // regular (non-one-off) spending only
  allowance: Cents; // safe-to-spend as of that day
  status: DayStatus;
}

/** Budget row for the month containing `month`: the latest one effective on or before it. */
export function budgetRowForMonth(budgets: Budget[], month: ISODate): Budget | null {
  const start = monthStart(month);
  let best: Budget | null = null;
  for (const b of budgets) {
    if (b.effectiveMonth <= start && (!best || b.effectiveMonth > best.effectiveMonth)) best = b;
  }
  return best;
}

/** Budget for the month containing `month`. */
export function budgetForMonth(budgets: Budget[], month: ISODate): Cents | null {
  return budgetRowForMonth(budgets, month)?.amountCents ?? null;
}

/**
 * What pace and streaks are judged against for the month containing `month`:
 * the budget minus the savings goal, floored to whole cents.
 */
export function paceBudgetForMonth(budgets: Budget[], month: ISODate): Cents | null {
  const row = budgetRowForMonth(budgets, month);
  if (!row) return null;
  // BigInt keeps the multiplication exact for any safe-integer budget.
  const kept = BigInt(10_000 - (row.savingsRateBps ?? 0));
  return Number((BigInt(row.amountCents) * kept) / BigInt(10_000));
}

/** Net spending between `from` and `to` inclusive; refunds reduce it. */
export function spentInRange(txns: Txn[], from: ISODate, to: ISODate): Cents {
  let total = 0;
  for (const t of txns) if (t.occurredOn >= from && t.occurredOn <= to) total += t.amountCents;
  return total;
}

function oneOffsInMonth(txns: Txn[], month: ISODate): Cents {
  return spentInRange(
    txns.filter((t) => t.isOneOff),
    monthStart(month),
    monthEnd(month),
  );
}

function allowance(remaining: Cents, day: ISODate): Cents {
  const daysLeft = daysInMonth(day) - dayOfMonth(day) + 1;
  return Math.max(0, Math.floor(remaining / daysLeft));
}

/**
 * (budget − all one-offs this month − regular spending before today) ÷ days left
 * including today, floored to whole cents and never below 0.
 */
export function safeToSpendToday(budget: Cents, txns: Txn[], today: ISODate): Cents {
  const regularBefore = spentInRange(
    txns.filter((t) => !t.isOneOff),
    monthStart(today),
    addDays(today, -1),
  );
  return allowance(budget - oneOffsInMonth(txns, today) - regularBefore, today);
}

/**
 * Status of every day in the month containing `month`.
 * Days on or after `today` are 'future'. Days before `firstActiveDay` (signup)
 * or in a month with no budget are 'inactive'. A day with no regular
 * transactions is 'nospend' (one-offs alone don't count as spending).
 */
export function dailyStatus(
  budget: Cents | null,
  txns: Txn[],
  month: ISODate,
  today: ISODate,
  firstActiveDay?: ISODate,
): DailyStatus[] {
  const start = monthStart(month);
  const end = monthEnd(month);
  const oneOffs = oneOffsInMonth(txns, month);

  const regularByDay = new Map<ISODate, { spent: Cents; count: number }>();
  for (const t of txns) {
    if (t.isOneOff || t.occurredOn < start || t.occurredOn > end) continue;
    const day = regularByDay.get(t.occurredOn) ?? { spent: 0, count: 0 };
    day.spent += t.amountCents;
    day.count += 1;
    regularByDay.set(t.occurredOn, day);
  }

  let regularBefore = 0;
  return eachDay(start, end).map((date) => {
    const day = regularByDay.get(date) ?? { spent: 0, count: 0 };
    const dayAllowance = budget === null ? 0 : allowance(budget - oneOffs - regularBefore, date);
    regularBefore += day.spent;

    let status: DayStatus;
    if (budget === null || (firstActiveDay && date < firstActiveDay)) status = "inactive";
    else if (date >= today) status = "future";
    else if (day.count === 0) status = "nospend";
    else status = day.spent <= dayAllowance ? "under" : "over";

    return { date, spent: day.spent, allowance: dayAllowance, status };
  });
}

/**
 * Daily statuses for every month from `firstActiveDay`'s month through `today`'s
 * month, judged against each month's budget minus its savings goal.
 */
export function dailyStatusHistory(
  budgets: Budget[],
  txns: Txn[],
  firstActiveDay: ISODate,
  today: ISODate,
): DailyStatus[] {
  const days: DailyStatus[] = [];
  for (let m = monthStart(firstActiveDay); m <= today; m = addMonths(m, 1)) {
    days.push(...dailyStatus(paceBudgetForMonth(budgets, m), txns, m, today, firstActiveDay));
  }
  return days;
}
