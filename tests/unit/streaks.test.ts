import { describe, expect, it } from "vitest";
import { dailyStatusHistory, type DailyStatus, type DayStatus, type Txn } from "@/lib/budget";
import { addDays } from "@/lib/dates";
import { streaks } from "@/lib/streaks";

function days(start: string, statuses: DayStatus[]): DailyStatus[] {
  return statuses.map((status, i) => ({ date: addDays(start, i), spent: 0, allowance: 0, status }));
}

describe("streaks", () => {
  it("counts the current run of under-pace and no-spend days", () => {
    const d = days("2026-10-01", ["under", "over", "under", "nospend", "under", "future"]);
    expect(streaks(d, "2026-10-06")).toEqual({ current: 3, best: 3, underThisMonth: 3, overThisMonth: 1, noSpendThisMonth: 1 });
  });

  it("resets on an over-pace day", () => {
    const d = days("2026-10-01", ["under", "under", "under", "over", "future"]);
    expect(streaks(d, "2026-10-05")).toEqual({ current: 0, best: 3, underThisMonth: 3, overThisMonth: 1, noSpendThisMonth: 0 });
  });

  it("doesn't count today until it ends", () => {
    const d = days("2026-10-01", ["under", "future"]);
    expect(streaks(d, "2026-10-02").current).toBe(1);
  });

  it("continues across month boundaries", () => {
    const d = days("2026-09-29", ["under", "nospend", "under", "under", "future"]);
    expect(streaks(d, "2026-10-03")).toEqual({ current: 4, best: 4, underThisMonth: 2, overThisMonth: 0, noSpendThisMonth: 0 });
  });

  it("only counts no-spend days in the current month", () => {
    const d = days("2026-09-29", ["nospend", "nospend", "nospend", "future"]);
    expect(streaks(d, "2026-10-02").noSpendThisMonth).toBe(1);
  });

  it("counts under, over and no-spend days in the current month only", () => {
    const d = days("2026-09-29", ["over", "under", "under", "over", "nospend", "over", "future"]);
    expect(streaks(d, "2026-10-05")).toMatchObject({ underThisMonth: 1, overThisMonth: 2, noSpendThisMonth: 1 });
  });

  it("excludes days before signup", () => {
    const d = days("2026-10-01", ["inactive", "inactive", "under", "future"]);
    expect(streaks(d, "2026-10-04")).toEqual({ current: 1, best: 1, underThisMonth: 1, overThisMonth: 0, noSpendThisMonth: 0 });
  });

  it("is zero with no history", () => {
    expect(streaks([], "2026-10-01")).toEqual({ current: 0, best: 0, underThisMonth: 0, overThisMonth: 0, noSpendThisMonth: 0 });
  });

  it("breaks on a day under the full budget but over the savings-goal target", () => {
    // $3,100 with 10% saved: $90 a day instead of $100.
    const budgets = [{ effectiveMonth: "2026-10-01", amountCents: 310_000, savingsRateBps: 1000 }];
    const txns: Txn[] = [{ occurredOn: "2026-10-02", amountCents: 9_500, isOneOff: false }];
    const result = streaks(dailyStatusHistory(budgets, txns, "2026-10-01", "2026-10-05"), "2026-10-05");
    expect(result).toEqual({ current: 2, best: 2, underThisMonth: 0, overThisMonth: 1, noSpendThisMonth: 3 });
  });

  it("can be broken or restored by editing a past transaction", () => {
    const budgets = [{ effectiveMonth: "2026-10-01", amountCents: 310_000 }];
    const history = (txns: Txn[]) =>
      streaks(dailyStatusHistory(budgets, txns, "2026-10-01", "2026-10-05"), "2026-10-05");

    const big: Txn = { occurredOn: "2026-10-02", amountCents: 50_000, isOneOff: false };
    expect(history([big]).current).toBe(2);
    expect(history([{ ...big, isOneOff: true }]).current).toBe(4);
    expect(history([{ ...big, amountCents: 5_000 }]).current).toBe(4);
  });
});
