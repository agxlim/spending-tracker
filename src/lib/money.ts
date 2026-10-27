// Money helpers. Amounts are always integer cents; parsing and formatting work
// on strings so no float ever holds an amount.

export type Cents = number;

/**
 * Parses user or bank input like "12.34", "-5", "$1,234.5", "(12.00)", "12.34-"
 * or "1.234,56" into cents. Parentheses or a leading/trailing minus mean
 * negative. Returns null if the input isn't a valid amount.
 */
export function parseCents(input: string): Cents | null {
  let s = input.replace(/\s/g, "");
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  // A comma followed by 1–2 final digits is a decimal comma ("1.234,56").
  s = /,\d{1,2}-?$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  // Currency symbols anywhere, currency codes ("USD") at either end.
  s = s.replace(/\p{Sc}/gu, "").replace(/^[A-Za-z]+|[A-Za-z]+$/g, "");
  const m = /^([+-]?)(\d*)(?:\.(\d{0,2}))?(-?)$/.exec(s);
  if (!m || (m[2] === "" && !m[3]) || (m[1] === "-" && m[4])) return null;
  if (m[1] === "-" || m[4]) negative = !negative;
  const cents = Number(m[2] || "0") * 100 + Number((m[3] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return negative && cents !== 0 ? -cents : cents;
}

/**
 * Like `parseCents` for an optional field: blank input is null (not set) and
 * invalid input is undefined.
 */
export function parseOptionalCents(input: string): Cents | null | undefined {
  if (input.trim() === "") return null;
  return parseCents(input) ?? undefined;
}

/** "1234.50"-style decimal string for a cents value. */
export function centsToDecimalString(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function formatCents(cents: Cents, currency: string, locale?: string): string {
  // Intl formats decimal strings exactly, so the amount never becomes a float.
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    centsToDecimalString(cents) as unknown as number,
  );
}

/**
 * Parses a percentage like "10", "12.5" or "7.25%" into basis points
 * (1000 = 10%). Returns null if the input isn't a valid percentage.
 */
export function parsePercentBps(input: string): number | null {
  const m = /^(\d{1,3})(?:\.(\d{0,2}))?%?$/.exec(input.replace(/\s/g, ""));
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** "12.5"-style percentage string for a basis-points value. */
export function bpsToPercentString(bps: number): string {
  const fraction = String(bps % 100).padStart(2, "0").replace(/0+$/, "");
  return fraction ? `${Math.trunc(bps / 100)}.${fraction}` : String(Math.trunc(bps / 100));
}
