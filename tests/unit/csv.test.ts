import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { guessDateFormat, parseCsvDate } from "@/lib/csv/dates";
import { guessMapping } from "@/lib/csv/detect";
import { findDuplicates } from "@/lib/csv/dedupe";
import { CsvLimitError, mapRows, parseCsvText } from "@/lib/csv/parse";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "../fixtures/csv", name), "utf8");

function importFixture(name: string) {
  const { headers, rows } = parseCsvText(fixture(name));
  const mapping = guessMapping(headers, rows);
  return { headers, mapping, mapped: mapRows(rows, mapping) };
}

describe("parseCsvDate", () => {
  it.each([
    ["2026-10-05", "YYYY-MM-DD", "2026-10-05"],
    ["2026/10/5", "YYYY-MM-DD", "2026-10-05"],
    ["2026-10-05 13:45:00", "YYYY-MM-DD", "2026-10-05"],
    ["2026-10-05T13:45:00Z", "YYYY-MM-DD", "2026-10-05"],
    ["10/05/2026", "MM/DD/YYYY", "2026-10-05"],
    ["10/5/26", "MM/DD/YYYY", "2026-10-05"],
    ["05/10/2026", "DD/MM/YYYY", "2026-10-05"],
    ["05.10.2026", "DD/MM/YYYY", "2026-10-05"],
    ["29/02/2028", "DD/MM/YYYY", "2028-02-29"],
  ] as const)("%j as %s → %s", (value, format, expected) => {
    expect(parseCsvDate(value, format)).toBe(expected);
  });

  it.each([
    ["29/02/2027", "DD/MM/YYYY"],
    ["13/01/2026", "MM/DD/YYYY"],
    ["26-10-05", "YYYY-MM-DD"],
    ["Oct 5 2026", "MM/DD/YYYY"],
    ["", "YYYY-MM-DD"],
  ] as const)("rejects %j as %s", (value, format) => {
    expect(parseCsvDate(value, format)).toBeNull();
  });
});

describe("guessDateFormat", () => {
  it("picks the format every sample fits", () => {
    expect(guessDateFormat(["2026-10-01", "2026-10-31"])).toBe("YYYY-MM-DD");
    expect(guessDateFormat(["10/02/2026", "10/13/2026"])).toBe("MM/DD/YYYY");
    expect(guessDateFormat(["02/10/2026", "15/10/2026"])).toBe("DD/MM/YYYY");
  });

  it("prefers MM/DD when both fit", () => {
    expect(guessDateFormat(["01/02/2026"])).toBe("MM/DD/YYYY");
  });

  it("returns null when nothing fits", () => {
    expect(guessDateFormat(["yesterday"])).toBeNull();
    expect(guessDateFormat([])).toBeNull();
  });
});

describe("CSV layouts", () => {
  it("single signed amount column, ISO dates, negative = spending", () => {
    const { mapping, mapped } = importFixture("signed-iso.csv");
    expect(mapping).toEqual({
      date: "Date",
      description: "Description",
      amount: { kind: "single", column: "Amount", negativeIsSpending: true },
      dateFormat: "YYYY-MM-DD",
    });
    expect(mapped).toEqual([
      { index: 0, ok: true, occurredOn: "2026-10-01", amountCents: 150_000, description: "RENT OCTOBER" },
      { index: 1, ok: true, occurredOn: "2026-10-02", amountCents: 575, description: "POS 4421 STARBUCKS #1234" },
      { index: 2, ok: true, occurredOn: "2026-10-03", amountCents: -200_000, description: "PAYROLL DEPOSIT" },
      { index: 3, ok: true, occurredOn: "2026-10-04", amountCents: -1_299, description: "AMAZON REFUND" },
    ]);
  });

  it("separate debit/credit columns with US dates", () => {
    const { mapping, mapped } = importFixture("debit-credit-us.csv");
    expect(mapping).toEqual({
      date: "Posted Date",
      description: "Payee",
      amount: { kind: "split", debit: "Debit", credit: "Credit" },
      dateFormat: "MM/DD/YYYY",
    });
    expect(mapped.map((r) => r.ok && [r.occurredOn, r.amountCents, r.description])).toEqual([
      ["2026-10-02", 450, "SQ *BLUE BOTTLE"],
      ["2026-10-05", 102_310, "TRADER JOE'S #552"],
      ["2026-10-07", -2_500, "RETURN TARGET"],
      ["2026-10-13", 1_800, "UBER TRIP"],
    ]);
  });

  it("money out/in columns with day-first dates", () => {
    const { mapping, mapped } = importFixture("uk-ddmm.csv");
    expect(mapping).toMatchObject({
      date: "Transaction Date",
      description: "Details",
      amount: { kind: "split", debit: "Money Out", credit: "Money In" },
      dateFormat: "DD/MM/YYYY",
    });
    expect(mapped.map((r) => r.ok && [r.occurredOn, r.amountCents])).toEqual([
      ["2026-10-02", 2_340],
      ["2026-10-15", -210_000],
      ["2026-10-28", 615],
    ]);
  });

  it("positive amounts as spending, dotted two-digit-year dates", () => {
    const { mapping, mapped } = importFixture("positive-spending.csv");
    expect(mapping).toMatchObject({
      date: "Trans. Date",
      description: "Memo",
      amount: { kind: "single", column: "Amount", negativeIsSpending: false },
      dateFormat: "MM/DD/YYYY",
    });
    expect(mapped.map((r) => r.ok && [r.occurredOn, r.amountCents])).toEqual([
      ["2026-10-03", 1_549],
      ["2026-10-04", 8_210],
      ["2026-10-05", -50_000],
    ]);
  });

  it("flags unparseable rows and handles a BOM, padded headers and blank lines", () => {
    const { headers, mapped } = importFixture("messy.csv");
    expect(headers).toEqual(["Date", "Description", "Amount"]);
    expect(mapped).toEqual([
      { index: 0, ok: true, occurredOn: "2026-10-01", amountCents: 350, description: "Coffee" },
      { index: 1, ok: false, error: "Unrecognized date" },
      { index: 2, ok: false, error: "Unrecognized amount" },
      { index: 3, ok: false, error: "Zero amount" },
      { index: 4, ok: false, error: "Unrecognized date" },
    ]);
  });

  it("leaves unguessable columns empty for the user to pick", () => {
    const mapping = guessMapping(["When", "What", "How much"], []);
    expect(mapping).toEqual({
      date: "",
      description: "",
      amount: { kind: "single", column: "", negativeIsSpending: true },
      dateFormat: "YYYY-MM-DD",
    });
  });
});

describe("limits", () => {
  it("rejects files over 5,000 rows", () => {
    const text = "Date,Amount\n" + "2026-10-01,1.00\n".repeat(5001);
    expect(() => parseCsvText(text)).toThrow(CsvLimitError);
  });

  it("accepts exactly 5,000 rows", () => {
    const text = "Date,Amount\n" + "2026-10-01,1.00\n".repeat(5000);
    expect(parseCsvText(text).rows).toHaveLength(5000);
  });

  it("rejects files over 2 MB", () => {
    const text = "Date,Description\n" + `2026-10-01,${"x".repeat(2 * 1024 * 1024)}\n`;
    expect(() => parseCsvText(text)).toThrow(CsvLimitError);
  });
});

describe("findDuplicates", () => {
  it("flags exact matches with existing transactions and earlier rows in the file", () => {
    const row = (occurredOn: string, amountCents: number, description: string) => ({
      occurredOn,
      amountCents,
      description,
    });
    const existing = [row("2026-10-01", 500, "Coffee")];
    const rows = [
      row("2026-10-01", 500, "Coffee"),
      row("2026-10-02", 500, "Coffee"),
      row("2026-10-02", 500, "Coffee"),
      row("2026-10-02", 501, "Coffee"),
      row("2026-10-02", 500, "coffee"),
    ];
    expect(findDuplicates(rows, existing)).toEqual(["existing", null, "in-file", null, null]);
  });
});
