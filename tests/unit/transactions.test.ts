import { describe, expect, it } from "vitest";
import {
  filterTransactions,
  fromRow,
  groupByDay,
  parseMonthParam,
  suggestCategory,
  type Transaction,
} from "@/lib/transactions";

let seq = 0;
const t = (occurredOn: string, amountCents: number, extra: Partial<Transaction> = {}): Transaction => ({
  id: String(++seq),
  occurredOn,
  amountCents,
  description: "Coffee",
  merchantKey: "coffee",
  category: "Dining",
  isOneOff: false,
  source: "manual",
  createdAt: `2026-10-27T00:00:${String(seq).padStart(2, "0")}Z`,
  ...extra,
});

describe("fromRow", () => {
  it("maps database columns and coerces bigint amounts to numbers", () => {
    const row = {
      id: "a",
      user_id: "u",
      occurred_on: "2026-10-05",
      amount_cents: "1250" as unknown as number,
      description: "Lunch",
      merchant_key: "lunch",
      category: "Dining" as const,
      is_one_off: true,
      source: "csv" as const,
      import_id: "i",
      created_at: "2026-10-05T12:00:00Z",
    };
    expect(fromRow(row)).toEqual({
      id: "a",
      occurredOn: "2026-10-05",
      amountCents: 1250,
      description: "Lunch",
      merchantKey: "lunch",
      category: "Dining",
      isOneOff: true,
      source: "csv",
      createdAt: "2026-10-05T12:00:00Z",
    });
  });
});

describe("parseMonthParam", () => {
  it("accepts YYYY-MM and falls back to the current month", () => {
    expect(parseMonthParam("2026-09", "2026-10-27")).toBe("2026-09-01");
    expect(parseMonthParam(undefined, "2026-10-27")).toBe("2026-10-01");
    expect(parseMonthParam("2026-13", "2026-10-27")).toBe("2026-10-01");
    expect(parseMonthParam("2026-9", "2026-10-27")).toBe("2026-10-01");
    expect(parseMonthParam(["2026-09"], "2026-10-27")).toBe("2026-10-01");
  });
});

describe("filterTransactions", () => {
  const txns = [
    t("2026-10-01", 500, { description: "Blue Bottle" }),
    t("2026-10-02", 150_000, { description: "Rent", category: "Bills", isOneOff: true }),
    t("2026-10-03", 4_000, { description: "Whole Foods", category: "Groceries" }),
  ];
  const all = { category: "all" as const, query: "", oneOffsOnly: false };

  it("filters by category, one-offs and case-insensitive text", () => {
    expect(filterTransactions(txns, all)).toHaveLength(3);
    expect(filterTransactions(txns, { ...all, category: "Groceries" }).map((x) => x.description)).toEqual(["Whole Foods"]);
    expect(filterTransactions(txns, { ...all, oneOffsOnly: true }).map((x) => x.description)).toEqual(["Rent"]);
    expect(filterTransactions(txns, { ...all, query: "  bottle " }).map((x) => x.description)).toEqual(["Blue Bottle"]);
    expect(filterTransactions(txns, { ...all, query: "rent", category: "Dining" })).toEqual([]);
  });
});

describe("groupByDay", () => {
  it("groups newest day first with net daily totals", () => {
    const a = t("2026-10-01", 500);
    const b = t("2026-10-03", 1_000);
    const c = t("2026-10-03", -200);
    const groups = groupByDay([a, b, c]);
    expect(groups.map((g) => [g.date, g.totalCents, g.items.map((i) => i.id)])).toEqual([
      ["2026-10-03", 800, [c.id, b.id]],
      ["2026-10-01", 500, [a.id]],
    ]);
  });
});

describe("suggestCategory", () => {
  it("looks up the remembered category for a merchant key", () => {
    const remembered = { starbucks: "Dining" as const };
    expect(suggestCategory("starbucks", remembered)).toBe("Dining");
    expect(suggestCategory("unknown", remembered)).toBeNull();
    expect(suggestCategory("", remembered)).toBeNull();
  });
});
