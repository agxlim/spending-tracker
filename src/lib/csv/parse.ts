// Parses a bank CSV in the browser and maps its rows to transactions.
// The raw file is never sent to or stored on the server.

import Papa from "papaparse";
import type { ISODate } from "../dates";
import { parseCents, type Cents } from "../money";
import { parseCsvDate } from "./dates";
import type { ColumnMapping } from "./detect";

export const MAX_CSV_ROWS = 5000;
export const MAX_CSV_BYTES = 2 * 1024 * 1024;

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export type MappedRow =
  | { index: number; ok: true; occurredOn: ISODate; amountCents: Cents; description: string }
  | { index: number; ok: false; error: string };

export class CsvLimitError extends Error {}

export function parseCsvText(text: string): ParsedCsv {
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) {
    throw new CsvLimitError("File is larger than 2 MB.");
  }
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  if (result.data.length > MAX_CSV_ROWS) {
    throw new CsvLimitError(`File has more than ${MAX_CSV_ROWS} rows.`);
  }
  return { headers: (result.meta.fields ?? []).filter(Boolean), rows: result.data };
}

function rowAmount(row: Record<string, string>, mapping: ColumnMapping): Cents | null {
  const amount = mapping.amount;
  if (amount.kind === "single") {
    const cents = parseCents(row[amount.column] ?? "");
    if (cents === null) return null;
    return amount.negativeIsSpending ? -cents : cents;
  }
  // Split columns: debits are spending, credits are refunds. Values may be
  // written signed or unsigned, so use their absolute size.
  const debitRaw = (row[amount.debit] ?? "").trim();
  const creditRaw = (row[amount.credit] ?? "").trim();
  const debit = debitRaw ? parseCents(debitRaw) : 0;
  const credit = creditRaw ? parseCents(creditRaw) : 0;
  if (debit === null || credit === null || (!debitRaw && !creditRaw)) return null;
  return Math.abs(debit) - Math.abs(credit);
}

export function mapRows(rows: Record<string, string>[], mapping: ColumnMapping): MappedRow[] {
  return rows.map((row, index) => {
    const occurredOn = parseCsvDate(row[mapping.date] ?? "", mapping.dateFormat);
    if (!occurredOn) return { index, ok: false, error: "Unrecognized date" };
    const amountCents = rowAmount(row, mapping);
    if (amountCents === null) return { index, ok: false, error: "Unrecognized amount" };
    if (amountCents === 0) return { index, ok: false, error: "Zero amount" };
    const description = (row[mapping.description] ?? "").trim().replace(/\s+/g, " ");
    return { index, ok: true, occurredOn, amountCents, description };
  });
}
