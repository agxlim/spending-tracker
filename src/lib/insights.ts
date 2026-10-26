// Insight calculations for a month. Totals include one-offs; the pace series
// keeps them as a separate step. Pure functions only.

import { addMonths, dayOfMonth, daysInMonth, eachDay, monthEnd, monthStart, type ISODate } from "./dates";
import type { Cents } from "./money";
import type { Category } from "./categories";
import { spentInRange, type Txn } from "./budget";

export interface InsightTxn extends Txn {
  category: Category;
  description: string;
  merchantKey: string | null;
}

export interface CategoryTotal {
  category: Category;
  totalCents: Cents;
}

export interface MerchantTotal {
  merchantKey: string;
  label: string; // description of the most recent transaction
  totalCents: Cents;
  count: number;
}

export interface MonthComparison {
  thisMonthCents: Cents;
  lastMonthCents: Cents;
  differenceCents: Cents; // this − last
}

export interface PacePoint {
  date: ISODate;
  idealCents: Cents; // straight line from 0 to the budget
  regularCents: Cents | null; // cumulative regular spending; null after today
  oneOffCents: Cents | null; // cumulative one-offs; null after today
}

function inMonth(txns: InsightTxn[], month: ISODate): InsightTxn[] {
  const start = monthStart(month);
  const end = monthEnd(month);
  return txns.filter((t) => t.occurredOn >= start && t.occurredOn <= end);
}

/** Net spending per category this month, largest first. Categories netting to 0 are dropped. */
export function categoryBreakdown(txns: InsightTxn[], month: ISODate): CategoryTotal[] {
  const totals = new Map<Category, Cents>();
  for (const t of inMonth(txns, month)) {
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amountCents);
  }
  return [...totals]
    .filter(([, total]) => total !== 0)
    .map(([category, totalCents]) => ({ category, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

/** Merchants with the most net spending this month. */
export function topMerchants(txns: InsightTxn[], month: ISODate, limit = 5): MerchantTotal[] {
  const byKey = new Map<string, MerchantTotal & { lastDate: ISODate }>();
  for (const t of inMonth(txns, month)) {
    const key = t.merchantKey || t.description.trim().toLowerCase();
    if (!key) continue;
    const entry = byKey.get(key) ?? {
      merchantKey: key,
      label: t.description,
      totalCents: 0,
      count: 0,
      lastDate: t.occurredOn,
    };
    entry.totalCents += t.amountCents;
    entry.count += 1;
    if (t.occurredOn >= entry.lastDate) {
      entry.lastDate = t.occurredOn;
      entry.label = t.description;
    }
    byKey.set(key, entry);
  }
  return [...byKey.values()]
    .filter((m) => m.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, limit)
    .map(({ merchantKey, label, totalCents, count }) => ({ merchantKey, label, totalCents, count }));
}

/**
 * Spending from the 1st through today's day-of-month, versus the same span last
 * month (clamped to last month's length, e.g. Mar 31 compares to Feb 28).
 */
export function compareToLastMonth(txns: Txn[], today: ISODate): MonthComparison {
  const thisMonthCents = spentInRange(txns, monthStart(today), today);
  const lastStart = addMonths(today, -1);
  const lastDay = Math.min(dayOfMonth(today), daysInMonth(lastStart));
  const lastEnd = `${lastStart.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
  const lastMonthCents = spentInRange(txns, lastStart, lastEnd);
  return { thisMonthCents, lastMonthCents, differenceCents: thisMonthCents - lastMonthCents };
}

/** Cumulative spending per day of the month versus an even-pace line to the budget. */
export function paceSeries(budget: Cents, txns: Txn[], month: ISODate, today: ISODate): PacePoint[] {
  const total = daysInMonth(month);
  const days = eachDay(monthStart(month), monthEnd(month));
  const regular = new Map<ISODate, Cents>();
  const oneOff = new Map<ISODate, Cents>();
  for (const t of txns) {
    const map = t.isOneOff ? oneOff : regular;
    map.set(t.occurredOn, (map.get(t.occurredOn) ?? 0) + t.amountCents);
  }

  let cumRegular = 0;
  let cumOneOff = 0;
  return days.map((date, i) => {
    cumRegular += regular.get(date) ?? 0;
    cumOneOff += oneOff.get(date) ?? 0;
    const past = date <= today;
    return {
      date,
      idealCents: Math.floor((budget * (i + 1)) / total),
      regularCents: past ? cumRegular : null,
      oneOffCents: past ? cumOneOff : null,
    };
  });
}
