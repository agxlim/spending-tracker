// Calendar-date helpers. Dates are ISO strings ('YYYY-MM-DD') representing a
// local calendar day in the user's timezone. Arithmetic runs on UTC midnight so
// the server's own timezone and DST never shift a day.

export type ISODate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUTC(date: ISODate): Date {
  const m = ISO_DATE.exec(date);
  if (!m) throw new Error(`Invalid ISO date: ${date}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function fromUTC(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function isValidISODate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return fromUTC(d) === value;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date it currently is in `timeZone`. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTC(d);
}

export function monthStart(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: ISODate, months: number): ISODate {
  const d = toUTC(monthStart(date));
  d.setUTCMonth(d.getUTCMonth() + months);
  return fromUTC(d);
}

export function daysInMonth(date: ISODate): number {
  const d = toUTC(monthStart(date));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

export function monthEnd(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-${String(daysInMonth(date)).padStart(2, "0")}`;
}

export function dayOfMonth(date: ISODate): number {
  return Number(date.slice(8, 10));
}

/** Inclusive list of dates from `from` to `to`. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}
