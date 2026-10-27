import { describe, expect, it } from "vitest";
import type { Txn } from "@/lib/budget";
import { dashboardSummary } from "@/lib/dashboard";

const spend = (occurredOn: string, amountCents: number, isOneOff = false): Txn => ({ occurredOn, amountCents, isOneOff });
const budgets = [{ effectiveMonth: "2026-10-01", amountCents: 310_000 }];

describe("dashboardSummary", () => {
  it("summarizes today and the month", () => {
    const txns = [
      spend("2026-10-01", 150_000, true), // rent
      spend("2026-10-01", 3_000),
      spend("2026-10-02", 2_000),
      spend("2026-10-03", 1_500),
      spend("2026-10-03", -500), // refund
      spend("2026-10-28", 20_000, true), // flight booked ahead
    ];
    const summary = dashboardSummary(budgets, txns, "2026-10-01", "2026-10-03")!;
    // (310000 − 170000 one-offs − 5000 regular before today) / 29 days left
    expect(summary).toEqual({
      budgetCents: 310_000,
      safeToSpendCents: 4_655,
      spentTodayCents: 1_000,
      leftTodayCents: 3_655,
      spentThisMonthCents: 176_000,
      oneOffsThisMonthCents: 170_000,
      remainingThisMonthCents: 134_000,
      daysLeft: 29,
      pacePercent: (3 / 31) * 100,
      streaks: { current: 2, best: 2, noSpendThisMonth: 0 },
    });
  });

  it("goes negative for today and the month when over", () => {
    const txns = [spend("2026-10-30", 300_000), spend("2026-10-31", 20_000)];
    const summary = dashboardSummary(budgets, txns, "2026-10-01", "2026-10-31")!;
    expect(summary.safeToSpendCents).toBe(10_000);
    expect(summary.leftTodayCents).toBe(-10_000);
    expect(summary.remainingThisMonthCents).toBe(-10_000);
    expect(summary.daysLeft).toBe(1);
    expect(summary.pacePercent).toBe(100);
  });

  it("returns null without a budget for the month", () => {
    expect(dashboardSummary(budgets, [], "2026-09-15", "2026-09-20")).toBeNull();
  });

  it("changes as soon as a transaction is added (optimistic updates)", () => {
    const before = dashboardSummary(budgets, [], "2026-10-01", "2026-10-02")!;
    const after = dashboardSummary(budgets, [spend("2026-10-02", 2_500)], "2026-10-01", "2026-10-02")!;
    expect(before.leftTodayCents - after.leftTodayCents).toBe(2_500);
    expect(after.safeToSpendCents).toBe(before.safeToSpendCents);
  });
});
