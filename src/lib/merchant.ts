// Normalizes a transaction description into a merchant key used to remember
// merchant → category. "POS 1234 STARBUCKS #55" → "starbucks".

const PREFIXES = [/^pos(?!\p{L})/u, /^debit(?!\p{L})/u, /^sq\s*\*/u];

export function merchantKey(description: string): string {
  let s = description.toLowerCase().trim();
  let changed = true;
  while (changed) {
    const before = s;
    s = s.replace(/^[^\p{L}]+/u, "");
    for (const prefix of PREFIXES) s = s.replace(prefix, "");
    changed = s !== before;
  }
  return s
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
