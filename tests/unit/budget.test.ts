import { describe, expect, it } from "vitest";
import {
  budgetForMonth,
  dailyStatus,
  dailyStatusHistory,
  safeToSpendToday,
  spentInRange,
  type Txn,
} from "@/lib/budget";

const spend = (occurredOn: string, amountCents: number, isOneOff = false): Txn => ({
  occurredOn,
  amountCents,
  isOneOff,
});

describe("budgetForMonth", () => {
  const budgets = [
    { effectiveMonth: "2026-01-01", amountCents: 100_000 },
    { effectiveMonth: "2026-06-01", amountCents: 200_000 },
  ];

  it("uses the latest budget effective on or before the month", () => {
    expect(budgetForMonth(budgets, "2026-05-31")).toBe(100_000);
    expect(budgetForMonth(budgets, "2026-06-01")).toBe(200_000);
    expect(budgetForMonth(budgets, "2026-10-26")).toBe(200_000);
  });

  it("returns null before the first budget", () => {
    expect(budgetForMonth(budgets, "2025-12-31")).toBeNull();
    expect(budgetForMonth([], "2026-10-01")).toBeNull();
  });

  it("doesn't depend on row order", () => {
    expect(budgetForMonth([...budgets].reverse(), "2026-07-01")).toBe(200_000);
  });
});

describe("spentInRange", () => {
  it("sums inclusively and lets refunds reduce the total", () => {
    const txns = [spend("2026-10-01", 1000), spend("2026-10-05", -300), spend("2026-10-06", 500)];
    expect(spentInRange(txns, "2026-10-01", "2026-10-05")).toBe(700);
    expect(spentInRange(txns, "2026-10-02", "2026-10-04")).toBe(0);
  });
});

describe("safeToSpendToday", () => {
  // $3,100 over 31 days of October = $100/day
  const budget = 310_000;

  it("divides the budget evenly on day one", () => {
    expect(safeToSpendToday(budget, [], "2026-10-01")).toBe(10_000);
  });

  it("recalculates from what's left before today", () => {
    const txns = [spend("2026-10-01", 5_000), spend("2026-10-03", 20_000)];
    // (310000 − 5000) / 30
    expect(safeToSpendToday(budget, txns, "2026-10-02")).toBe(10_166);
    // (310000 − 25000) / 28
    expect(safeToSpendToday(budget, txns, "2026-10-04")).toBe(10_178);
  });

  it("ignores today's own spending", () => {
    expect(safeToSpendToday(budget, [spend("2026-10-01", 9_999)], "2026-10-01")).toBe(10_000);
  });

  it("reserves one-offs for the whole month up front, including future-dated ones", () => {
    const txns = [spend("2026-10-28", 150_000, true)];
    // (310000 − 150000) / 31 = 5161.29
    expect(safeToSpendToday(budget, txns, "2026-10-01")).toBe(5_161);
  });

  it("ignores transactions from other months", () => {
    const txns = [spend("2026-09-30", 50_000), spend("2026-11-01", 50_000, true)];
    expect(safeToSpendToday(budget, txns, "2026-10-01")).toBe(10_000);
  });

  it("counts refunds as money back", () => {
    const txns = [spend("2026-10-01", 10_000), spend("2026-10-02", -10_000)];
    expect(safeToSpendToday(budget, txns, "2026-10-03")).toBe(Math.floor(310_000 / 29));
  });

  it("is $0 once the budget is used up", () => {
    expect(safeToSpendToday(budget, [spend("2026-10-01", 400_000)], "2026-10-02")).toBe(0);
    expect(safeToSpendToday(budget, [spend("2026-10-01", 310_000, true)], "2026-10-01")).toBe(0);
  });

  it("gives the whole remainder on the last day", () => {
    expect(safeToSpendToday(budget, [spend("2026-10-01", 300_000)], "2026-10-31")).toBe(10_000);
  });

  it("handles February in leap and non-leap years", () => {
    expect(safeToSpendToday(29_000, [], "2028-02-01")).toBe(1_000);
    expect(safeToSpendToday(28_000, [], "2027-02-01")).toBe(1_000);
    expect(safeToSpendToday(29_000, [], "2028-02-29")).toBe(29_000);
  });
});

describe("dailyStatus", () => {
  const budget = 310_000;
  const today = "2026-10-05";

  const byDate = (days: ReturnType<typeof dailyStatus>) =>
    Object.fromEntries(days.map((d) => [d.date, d]));

  it("judges each finished day against its own allowance", () => {
    const txns = [
      spend("2026-10-01", 5_000), // allowance 10000 → under
      spend("2026-10-03", 20_000), // allowance (310000−5000)/29 = 10517 → over
      spend("2026-10-04", 9_000), // allowance (310000−25000)/28 = 10178 → under
    ];
    const days = byDate(dailyStatus(budget, txns, "2026-10-01", today));
    expect(days["2026-10-01"]).toEqual({ date: "2026-10-01", spent: 5_000, allowance: 10_000, status: "under" });
    expect(days["2026-10-02"].status).toBe("nospend");
    expect(days["2026-10-03"]).toMatchObject({ allowance: 10_517, status: "over" });
    expect(days["2026-10-04"]).toMatchObject({ allowance: 10_178, status: "under" });
  });

  it("treats today and later as future", () => {
    const days = dailyStatus(budget, [], "2026-10-01", today);
    expect(days).toHaveLength(31);
    expect(days[4]).toMatchObject({ date: "2026-10-05", status: "future" });
    expect(days[30].status).toBe("future");
  });

  it("allows spending exactly the allowance", () => {
    const days = dailyStatus(budget, [spend("2026-10-01", 10_000)], "2026-10-01", today);
    expect(days[0].status).toBe("under");
  });

  it("ignores one-offs when judging pace, and a one-off-only day is no-spend", () => {
    const txns = [spend("2026-10-01", 150_000, true)];
    const days = dailyStatus(budget, txns, "2026-10-01", today);
    expect(days[0]).toMatchObject({ spent: 0, allowance: 5_161, status: "nospend" });
  });

  it("counts a refund-only day as under pace, not no-spend", () => {
    const days = dailyStatus(budget, [spend("2026-10-02", -1_500)], "2026-10-01", today);
    expect(days[1]).toMatchObject({ spent: -1_500, status: "under" });
  });

  it("counts a day netting to zero as under pace, not no-spend", () => {
    const txns = [spend("2026-10-02", 1_500), spend("2026-10-02", -1_500)];
    expect(dailyStatus(budget, txns, "2026-10-01", today)[1].status).toBe("under");
  });

  it("marks any spending over once the budget is exhausted", () => {
    const txns = [spend("2026-10-01", 310_000), spend("2026-10-02", 1), spend("2026-10-03", -100)];
    const days = dailyStatus(budget, txns, "2026-10-01", today);
    expect(days[0].status).toBe("over");
    expect(days[1]).toMatchObject({ allowance: 0, status: "over" });
    expect(days[2]).toMatchObject({ allowance: 0, status: "under" });
  });

  it("marks days before signup inactive", () => {
    const days = dailyStatus(budget, [], "2026-10-01", today, "2026-10-03");
    expect(days.map((d) => d.status).slice(0, 4)).toEqual(["inactive", "inactive", "nospend", "nospend"]);
  });

  it("marks every day inactive when there's no budget", () => {
    const days = dailyStatus(null, [spend("2026-10-01", 100)], "2026-10-01", today);
    expect(days.every((d) => d.status === "inactive")).toBe(true);
  });

  it("matches safeToSpendToday for today's allowance", () => {
    const txns = [spend("2026-10-01", 7_000), spend("2026-10-02", 3_333), spend("2026-10-20", 90_000, true)];
    const days = dailyStatus(budget, txns, "2026-10-01", today);
    expect(days[4].allowance).toBe(safeToSpendToday(budget, txns, today));
  });

  it("reflects edits to past transactions", () => {
    const before = dailyStatus(budget, [spend("2026-10-02", 20_000)], "2026-10-01", today);
    const after = dailyStatus(budget, [spend("2026-10-02", 2_000)], "2026-10-01", today);
    expect(before[1].status).toBe("over");
    expect(after[1].status).toBe("under");
  });
});

describe("dailyStatusHistory", () => {
  it("covers signup month through today using each month's budget", () => {
    const budgets = [
      { effectiveMonth: "2026-09-01", amountCents: 30_000 }, // $10/day in September
      { effectiveMonth: "2026-10-01", amountCents: 310_000 }, // $100/day in October
    ];
    const txns = [spend("2026-09-30", 5_000), spend("2026-10-01", 5_000)];
    const days = dailyStatusHistory(budgets, txns, "2026-09-29", "2026-10-03");

    expect(days[0]).toMatchObject({ date: "2026-09-01", status: "inactive" });
    expect(days).toHaveLength(30 + 31);
    const sep30 = days.find((d) => d.date === "2026-09-30")!;
    const oct1 = days.find((d) => d.date === "2026-10-01")!;
    expect(sep30).toMatchObject({ allowance: 30_000, status: "under" });
    expect(oct1).toMatchObject({ allowance: 10_000, status: "under" });
  });
});
