import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/categories";
import {
  calendarWeeks,
  categoryBreakdown,
  compareToLastMonth,
  paceSeries,
  topMerchants,
  type InsightTxn,
} from "@/lib/insights";

const txn = (
  occurredOn: string,
  amountCents: number,
  category: Category,
  description: string,
  isOneOff = false,
): InsightTxn => ({ occurredOn, amountCents, category, description, merchantKey: description.toLowerCase(), isOneOff });

const october: InsightTxn[] = [
  txn("2026-10-01", 150_000, "Bills", "Rent", true),
  txn("2026-10-02", 600, "Dining", "Starbucks"),
  txn("2026-10-03", 700, "Dining", "Starbucks"),
  txn("2026-10-03", 8_000, "Groceries", "Whole Foods"),
  txn("2026-10-04", 3_000, "Shopping", "Target"),
  txn("2026-10-05", -3_000, "Shopping", "Target"),
  txn("2026-10-05", 1_200, "Transport", "Uber"),
  txn("2026-10-06", 2_000, "Entertainment", "Cinema"),
  txn("2026-10-06", 900, "Health", "Pharmacy"),
  txn("2026-09-30", 99_999, "Other", "September thing"),
];

describe("categoryBreakdown", () => {
  it("totals categories for the month, including one-offs, largest first", () => {
    expect(categoryBreakdown(october, "2026-10-15")).toEqual([
      { category: "Bills", totalCents: 150_000 },
      { category: "Groceries", totalCents: 8_000 },
      { category: "Entertainment", totalCents: 2_000 },
      { category: "Dining", totalCents: 1_300 },
      { category: "Transport", totalCents: 1_200 },
      { category: "Health", totalCents: 900 },
    ]);
  });
});

describe("topMerchants", () => {
  it("returns the five merchants with the most net spending", () => {
    const top = topMerchants(october, "2026-10-15");
    expect(top.map((m) => [m.label, m.totalCents, m.count])).toEqual([
      ["Rent", 150_000, 1],
      ["Whole Foods", 8_000, 1],
      ["Cinema", 2_000, 1],
      ["Starbucks", 1_300, 2],
      ["Uber", 1_200, 1],
    ]);
  });

  it("groups by merchant key and labels with the latest description", () => {
    const txns = [
      { ...txn("2026-10-01", 500, "Dining", "POS STARBUCKS #1"), merchantKey: "starbucks" },
      { ...txn("2026-10-09", 500, "Dining", "STARBUCKS #22"), merchantKey: "starbucks" },
    ];
    expect(topMerchants(txns, "2026-10-01")).toEqual([
      { merchantKey: "starbucks", label: "STARBUCKS #22", totalCents: 1_000, count: 2 },
    ]);
  });
});

describe("compareToLastMonth", () => {
  it("compares month-to-date with the same days last month", () => {
    const txns = [
      txn("2026-09-05", 1_000, "Other", "a"),
      txn("2026-09-06", 5_000, "Other", "b"), // after Sep 5, excluded
      txn("2026-10-01", 3_000, "Other", "c"),
      txn("2026-10-05", 500, "Other", "d"),
    ];
    expect(compareToLastMonth(txns, "2026-10-05")).toEqual({
      thisMonthCents: 3_500,
      lastMonthCents: 1_000,
      differenceCents: 2_500,
    });
  });

  it("clamps to the end of a shorter previous month", () => {
    const txns = [txn("2027-02-28", 1_000, "Other", "a"), txn("2027-03-31", 2_000, "Other", "b")];
    expect(compareToLastMonth(txns, "2027-03-31")).toMatchObject({ thisMonthCents: 2_000, lastMonthCents: 1_000 });
  });

  it("works across the year boundary", () => {
    const txns = [txn("2026-12-01", 700, "Other", "a")];
    expect(compareToLastMonth(txns, "2027-01-01").lastMonthCents).toBe(700);
  });
});

describe("paceSeries", () => {
  it("plots cumulative regular spending and one-offs separately against an even pace", () => {
    const series = paceSeries(310_000, october, "2026-10-01", "2026-10-03");
    expect(series).toHaveLength(31);
    expect(series[0]).toEqual({ date: "2026-10-01", idealCents: 10_000, regularCents: 0, oneOffCents: 150_000 });
    expect(series[2]).toEqual({ date: "2026-10-03", idealCents: 30_000, regularCents: 9_300, oneOffCents: 150_000 });
    expect(series[3]).toMatchObject({ regularCents: null, oneOffCents: null });
    expect(series[30].idealCents).toBe(310_000);
  });
});

describe("calendarWeeks", () => {
  it("lays out a month in Sunday-first weeks", () => {
    // October 2026 starts on a Thursday
    const weeks = calendarWeeks("2026-10-15");
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(weeks[4]).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
  });

  it("handles a February that fits exactly in four weeks", () => {
    // February 2026 starts on a Sunday and has 28 days
    const weeks = calendarWeeks("2026-02-01");
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((d) => d !== null)).toBe(true);
  });

  it("pads the last week", () => {
    const weeks = calendarWeeks("2028-02-01"); // starts Tuesday, 29 days
    expect(weeks.flat()).toHaveLength(35);
    expect(weeks[4].slice(3)).toEqual([null, null, null, null]);
  });
});
