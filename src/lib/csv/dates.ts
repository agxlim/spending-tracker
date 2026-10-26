// Parsing bank CSV dates into ISO calendar dates.

import { isValidISODate, type ISODate } from "../dates";

export const DATE_FORMATS = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

/**
 * Parses `value` in `format`. Separators may be '/', '-' or '.'; two-digit
 * years mean 20YY (except in YYYY-MM-DD); a trailing time ("2026-10-05 13:45",
 * "...T13:45Z") is ignored.
 */
export function parseCsvDate(value: string, format: DateFormat): ISODate | null {
  const datePart = value.trim().split(/[\sT]/)[0];
  const parts = datePart.split(/[/.-]/);
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return null;

  const [year, m, d] =
    format === "YYYY-MM-DD"
      ? parts
      : format === "MM/DD/YYYY"
        ? [parts[2], parts[0], parts[1]]
        : [parts[2], parts[1], parts[0]];
  const y = year.length === 2 && format !== "YYYY-MM-DD" ? `20${year}` : year;
  if (y.length !== 4 || m.length > 2 || d.length > 2) return null;

  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return isValidISODate(iso) ? iso : null;
}

/**
 * Picks the format that parses every non-empty sample. When both MM/DD and
 * DD/MM fit (all days ≤ 12), prefers MM/DD. Returns null if none fit.
 */
export function guessDateFormat(samples: string[]): DateFormat | null {
  const values = samples.map((s) => s.trim()).filter(Boolean);
  if (values.length === 0) return null;
  for (const format of DATE_FORMATS) {
    if (values.every((v) => parseCsvDate(v, format) !== null)) return format;
  }
  return null;
}
