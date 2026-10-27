// Display formatting. A fixed locale keeps server and browser output identical,
// which avoids hydration mismatches.

import type { ISODate } from "./dates";
import { centsToDecimalString, formatCents, type Cents } from "./money";

const LOCALE = "en-US";

export function money(cents: Cents, currency: string): string {
  return formatCents(cents, currency, LOCALE);
}

/** Short form for axis ticks: $1.2K. */
export function compactMoney(cents: Cents, currency: string): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency, notation: "compact" }).format(
    centsToDecimalString(cents) as unknown as number,
  );
}

// ISO dates are calendar days, so format them as UTC midnight to avoid shifting.
const dayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });

export function dayLabel(date: ISODate): string {
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}

export function monthLabel(date: ISODate): string {
  return monthFormat.format(new Date(`${date}T00:00:00Z`));
}
