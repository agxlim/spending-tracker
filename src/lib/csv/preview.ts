// Builds the import preview from mapped CSV rows. Pure functions only.

import { DEFAULT_CATEGORY, type Category } from "../categories";
import type { ISODate } from "../dates";
import { merchantKey } from "../merchant";
import type { Cents } from "../money";
import { columnMapping, type TransactionInput } from "../schemas";
import { findDuplicates, type DedupeFields, type DuplicateReason } from "./dedupe";
import { guessMapping, type ColumnMapping } from "./detect";
import type { MappedRow } from "./parse";

export const MAX_DESCRIPTION_LENGTH = 200;

export interface PreviewRow {
  index: number;
  occurredOn: ISODate;
  amountCents: Cents;
  description: string;
  category: Category;
  isOneOff: boolean;
  /** Whether to import it. Money in (negative) starts unticked, since it's often income, not a refund. */
  include: boolean;
  duplicate: DuplicateReason;
}

export interface Preview {
  rows: PreviewRow[];
  errors: { index: number; error: string }[];
}

function columnsOf(mapping: ColumnMapping): string[] {
  const amount = mapping.amount.kind === "single" ? [mapping.amount.column] : [mapping.amount.debit, mapping.amount.credit];
  return [mapping.date, mapping.description, ...amount];
}

/** A mapping is usable when every field is filled in and names a column in the file. */
export function isMappingComplete(mapping: ColumnMapping, headers: string[]): boolean {
  return columnMapping.safeParse(mapping).success && columnsOf(mapping).every((c) => headers.includes(c));
}

/** The user's saved mapping if it fits this file's columns, otherwise a fresh guess. */
export function resolveMapping(saved: unknown, headers: string[], rows: Record<string, string>[]): ColumnMapping {
  const parsed = columnMapping.safeParse(saved);
  if (parsed.success && isMappingComplete(parsed.data, headers)) return parsed.data;
  return guessMapping(headers, rows);
}

export function buildPreview(
  mapped: MappedRow[],
  existing: DedupeFields[],
  remembered: Record<string, Category>,
): Preview {
  const errors: Preview["errors"] = [];
  const parsed: Omit<PreviewRow, "duplicate">[] = [];
  for (const row of mapped) {
    if (!row.ok) {
      errors.push({ index: row.index, error: row.error });
      continue;
    }
    const description = row.description.slice(0, MAX_DESCRIPTION_LENGTH).trim();
    parsed.push({
      index: row.index,
      occurredOn: row.occurredOn,
      amountCents: row.amountCents,
      description,
      category: remembered[merchantKey(description)] ?? DEFAULT_CATEGORY,
      isOneOff: false,
      include: row.amountCents > 0,
    });
  }
  const duplicates = findDuplicates(parsed, existing);
  return {
    rows: parsed.map((row, i) => ({ ...row, duplicate: duplicates[i], include: row.include && !duplicates[i] })),
    errors,
  };
}

/** The rows to send to the server. */
export function rowsToImport(rows: PreviewRow[]): TransactionInput[] {
  return rows
    .filter((r) => r.include && !r.duplicate)
    .map(({ occurredOn, amountCents, description, category, isOneOff }) => ({
      occurredOn,
      amountCents,
      description,
      category,
      isOneOff,
    }));
}

/** Earliest and latest dates among the rows, for looking up existing duplicates. */
export function dateRange(rows: MappedRow[]): { from: ISODate; to: ISODate } | null {
  let from: ISODate | null = null;
  let to: ISODate | null = null;
  for (const row of rows) {
    if (!row.ok) continue;
    if (!from || row.occurredOn < from) from = row.occurredOn;
    if (!to || row.occurredOn > to) to = row.occurredOn;
  }
  return from && to ? { from, to } : null;
}
