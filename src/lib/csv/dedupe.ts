// Exact-duplicate detection for CSV import: same date + amount + description.
// Mirrors the check in the import_transactions() database function.

import type { ISODate } from "../dates";
import type { Cents } from "../money";

export interface DedupeFields {
  occurredOn: ISODate;
  amountCents: Cents;
  description: string;
}

export type DuplicateReason = "existing" | "in-file" | null;

export function dedupeKey(t: DedupeFields): string {
  return `${t.occurredOn}|${t.amountCents}|${t.description}`;
}

/** For each row: whether it matches an existing transaction or an earlier row in the file. */
export function findDuplicates(rows: DedupeFields[], existing: DedupeFields[]): DuplicateReason[] {
  const existingKeys = new Set(existing.map(dedupeKey));
  const seen = new Set<string>();
  return rows.map((row) => {
    const key = dedupeKey(row);
    if (existingKeys.has(key)) return "existing";
    if (seen.has(key)) return "in-file";
    seen.add(key);
    return null;
  });
}
