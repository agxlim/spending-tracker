// Display formatting. A fixed locale keeps server and browser output identical,
// which avoids hydration mismatches.

import type { ISODate } from "./dates";
import { bpsToPercentString, centsToDecimalString, formatCents, type Cents } from "./money";

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

/** "12.5%"-style label for basis points, to one decimal place; negative values keep their sign. */
export function percent(bps: number): string {
  const tenths = Math.trunc(Math.abs(bps) / 10) * 10;
  return `${bps < 0 && tenths > 0 ? "-" : ""}${bpsToPercentString(tenths)}%`;
}

const weekdayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: "UTC" });

/** "Mon"-style weekday for a calendar day. */
export function weekdayLabel(date: ISODate): string {
  return weekdayFormat.format(new Date(`${date}T00:00:00Z`));
}
