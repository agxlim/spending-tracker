// Transaction list helpers for the UI. Pure functions only.

import { isValidISODate, monthStart, type ISODate } from "./dates";
import type { Cents } from "./money";
import type { Category } from "./categories";
import type { InsightTxn } from "./insights";
import type { Database } from "./supabase/database.types";

export interface Transaction extends InsightTxn {
  id: string;
  source: "manual" | "csv";
  createdAt: string;
}

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];

export function fromRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    occurredOn: row.occurred_on,
    amountCents: Number(row.amount_cents),
    description: row.description,
    merchantKey: row.merchant_key,
    category: row.category,
    isOneOff: row.is_one_off,
    source: row.source,
    createdAt: row.created_at,
  };
}

/** Reads a `?month=YYYY-MM` param, falling back to the month containing `today`. */
export function parseMonthParam(param: string | string[] | undefined, today: ISODate): ISODate {
  if (typeof param === "string" && /^\d{4}-\d{2}$/.test(param) && isValidISODate(`${param}-01`)) {
    return `${param}-01`;
  }
  return monthStart(today);
}

export interface TransactionFilter {
  category: Category | "all";
  query: string;
  oneOffsOnly: boolean;
}

export function filterTransactions(txns: Transaction[], filter: TransactionFilter): Transaction[] {
  const query = filter.query.trim().toLowerCase();
  return txns.filter(
    (t) =>
      (filter.category === "all" || t.category === filter.category) &&
      (!filter.oneOffsOnly || t.isOneOff) &&
      (!query || t.description.toLowerCase().includes(query)),
  );
}

export interface DayGroup {
  date: ISODate;
  totalCents: Cents;
  items: Transaction[];
}

/** Groups by date, newest day first; within a day, newest entry first. */
export function groupByDay(txns: Transaction[]): DayGroup[] {
  const sorted = [...txns].sort(
    (a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt),
  );
  const groups: DayGroup[] = [];
  for (const t of sorted) {
    let group = groups.at(-1);
    if (!group || group.date !== t.occurredOn) {
      group = { date: t.occurredOn, totalCents: 0, items: [] };
      groups.push(group);
    }
    group.totalCents += t.amountCents;
    group.items.push(t);
  }
  return groups;
}

/** The remembered category for a description, if its merchant has one. */
export function suggestCategory(
  merchantKeyValue: string,
  remembered: Record<string, Category>,
): Category | null {
  return (merchantKeyValue && remembered[merchantKeyValue]) || null;
}
