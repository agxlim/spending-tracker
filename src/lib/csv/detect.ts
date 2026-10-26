// Guesses a column mapping from CSV headers and sample rows. The user confirms
// or edits it before importing.

import { parseCents } from "../money";
import { guessDateFormat, type DateFormat } from "./dates";

export type AmountMapping =
  | { kind: "single"; column: string; negativeIsSpending: boolean }
  | { kind: "split"; debit: string; credit: string };

export interface ColumnMapping {
  date: string;
  description: string;
  amount: AmountMapping;
  dateFormat: DateFormat;
}

type Row = Record<string, string>;

const DATE_HEADERS = [/^(transaction |trans\.? |posted |posting |booking )?date$/, /date/];
const AMOUNT_HEADERS = [/^amount$/, /amount/];
const DEBIT_HEADERS = [/debit/, /withdrawal/, /money out/, /paid out/];
const CREDIT_HEADERS = [/credit/, /deposit/, /money in/, /paid in/];
const DESCRIPTION_HEADERS = [/description/, /payee/, /merchant/, /details/, /narrative/, /memo/, /name/];

function findHeader(headers: string[], patterns: RegExp[], exclude: string[] = []): string | null {
  for (const pattern of patterns) {
    const match = headers.find((h) => !exclude.includes(h) && pattern.test(h.trim().toLowerCase()));
    if (match) return match;
  }
  return null;
}

/**
 * Most banks export spending as negative numbers, so unless most non-zero
 * amounts are positive we assume negative means spending.
 */
function guessNegativeIsSpending(rows: Row[], column: string): boolean {
  let negative = 0;
  let positive = 0;
  for (const row of rows) {
    const cents = parseCents(row[column] ?? "");
    if (cents === null || cents === 0) continue;
    if (cents < 0) negative += 1;
    else positive += 1;
  }
  return negative >= positive;
}

/** Best-guess mapping; fields that couldn't be guessed are left empty strings. */
export function guessMapping(headers: string[], rows: Row[]): ColumnMapping {
  const date = findHeader(headers, DATE_HEADERS) ?? "";
  const debit = findHeader(headers, DEBIT_HEADERS, [date]);
  const credit = findHeader(headers, CREDIT_HEADERS, [date]);
  const amountColumn = findHeader(headers, AMOUNT_HEADERS, [date, debit ?? "", credit ?? ""]);
  const used = [date, debit ?? "", credit ?? "", amountColumn ?? ""];
  const description = findHeader(headers, DESCRIPTION_HEADERS, used) ?? "";

  const amount: AmountMapping =
    !amountColumn && debit && credit
      ? { kind: "split", debit, credit }
      : {
          kind: "single",
          column: amountColumn ?? "",
          negativeIsSpending: amountColumn ? guessNegativeIsSpending(rows, amountColumn) : true,
        };

  const samples = date ? rows.slice(0, 50).map((r) => r[date] ?? "") : [];
  const dateFormat = guessDateFormat(samples) ?? "YYYY-MM-DD";

  return { date, description, amount, dateFormat };
}
