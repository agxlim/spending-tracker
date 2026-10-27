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
    const { monthDays, ...summary } = dashboardSummary(budgets, txns, "2026-10-01", "2026-10-03")!;
    // (310000 − 170000 one-offs − 5000 regular before today) / 29 days left
    expect(summary).toEqual({
      budgetCents: 310_000,
      safeToSpendCents: 4_655,
      savingsRateBps: 0,
      streakTargetCents: 4_655,
      spentTodayCents: 1_000,
      leftTodayCents: 3_655,
      spentThisMonthCents: 176_000,
      oneOffsThisMonthCents: 170_000,
      remainingThisMonthCents: 134_000,
      daysLeft: 29,
      pacePercent: (3 / 31) * 100,
      streaks: { current: 2, best: 2, noSpendThisMonth: 0 },
    });
    expect(monthDays).toHaveLength(31);
    expect(monthDays.slice(0, 3).map((d) => d.status)).toEqual(["under", "under", "future"]);
  });

  it("keeps safe to spend on the full budget but sets the streak target from the savings goal", () => {
    const withGoal = [{ effectiveMonth: "2026-10-01", amountCents: 310_000, savingsRateBps: 1000 }];
    const txns = [spend("2026-10-01", 150_000, true), spend("2026-10-01", 3_000), spend("2026-10-02", 2_000)];
    const summary = dashboardSummary(withGoal, txns, "2026-10-01", "2026-10-03")!;
    expect(summary.savingsRateBps).toBe(1000);
    // (310000 − 150000 − 5000) / 29 for safe to spend; (279000 − 150000 − 5000) / 29 for streaks
    expect(summary.safeToSpendCents).toBe(5_344);
    expect(summary.streakTargetCents).toBe(4_275);
    expect(summary.monthDays[2]).toMatchObject({ date: "2026-10-03", allowance: 4_275, status: "future" });
  });

  it("lists only today's month in the calendar days", () => {
    const twoMonths = [{ effectiveMonth: "2026-09-01", amountCents: 300_000 }, ...budgets];
    const summary = dashboardSummary(twoMonths, [], "2026-09-15", "2026-10-03")!;
    expect(summary.monthDays[0].date).toBe("2026-10-01");
    expect(summary.monthDays).toHaveLength(31);
    expect(summary.streaks.current).toBe(18);
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
    expect(after.monthDays[1]).toMatchObject({ date: "2026-10-02", spent: 2_500 });
  });
});
