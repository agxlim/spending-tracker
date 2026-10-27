import { describe, expect, it } from "vitest";
import { budgetInput, importInput, onboardingInput, transactionInput } from "@/lib/schemas";

describe("transactionInput", () => {
  const valid = {
    occurredOn: "2026-10-05",
    amountCents: 1234,
    description: "  Coffee ",
    category: "Dining",
    isOneOff: false,
  };

  it("accepts and trims a valid transaction", () => {
    expect(transactionInput.parse(valid)).toEqual({ ...valid, description: "Coffee" });
  });

  it("accepts refunds as negative amounts", () => {
    expect(transactionInput.safeParse({ ...valid, amountCents: -500 }).success).toBe(true);
  });

  it.each([
    { amountCents: 0 },
    { amountCents: 12.5 },
    { occurredOn: "2026-02-30" },
    { category: "Rent" },
    { description: "x".repeat(201) },
  ])("rejects %o", (override) => {
    expect(transactionInput.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe("onboardingInput", () => {
  it("validates currency, timezone and a positive budget", () => {
    const ok = { currency: "USD", timezone: "America/New_York", amountCents: 200_000, savingsRateBps: 0, incomeCents: null };
    expect(onboardingInput.safeParse(ok).success).toBe(true);
    expect(onboardingInput.safeParse({ ...ok, currency: "usd" }).success).toBe(false);
    expect(onboardingInput.safeParse({ ...ok, timezone: "Nowhere/City" }).success).toBe(false);
    expect(onboardingInput.safeParse({ ...ok, amountCents: 0 }).success).toBe(false);
  });
});

describe("budgetInput", () => {
  it("accepts a savings goal from 0% to 90% in whole basis points", () => {
    const ok = { amountCents: 200_000, savingsRateBps: 1000, incomeCents: null };
    expect(budgetInput.safeParse(ok).success).toBe(true);
    expect(budgetInput.safeParse({ ...ok, savingsRateBps: 0 }).success).toBe(true);
    expect(budgetInput.safeParse({ ...ok, savingsRateBps: 9000 }).success).toBe(true);
    expect(budgetInput.safeParse({ ...ok, savingsRateBps: 9001 }).success).toBe(false);
    expect(budgetInput.safeParse({ ...ok, savingsRateBps: -1 }).success).toBe(false);
    expect(budgetInput.safeParse({ ...ok, savingsRateBps: 12.5 }).success).toBe(false);
  });

  it("accepts no income or a positive whole-cent income", () => {
    const ok = { amountCents: 200_000, savingsRateBps: 0, incomeCents: 400_000 };
    expect(budgetInput.safeParse(ok).success).toBe(true);
    expect(budgetInput.safeParse({ ...ok, incomeCents: null }).success).toBe(true);
    expect(budgetInput.safeParse({ ...ok, incomeCents: 0 }).success).toBe(false);
    expect(budgetInput.safeParse({ ...ok, incomeCents: -100 }).success).toBe(false);
    expect(budgetInput.safeParse({ ...ok, incomeCents: 1.5 }).success).toBe(false);
  });
});

describe("importInput", () => {
  it("caps rows at 5,000", () => {
    const row = { occurredOn: "2026-10-01", amountCents: 100, description: "x", category: "Other", isOneOff: false };
    const input = {
      filename: "bank.csv",
      rowCount: 5000,
      mapping: {
        date: "Date",
        description: "Description",
        dateFormat: "YYYY-MM-DD",
        amount: { kind: "single", column: "Amount", negativeIsSpending: true },
      },
      rows: Array(5001).fill(row),
    };
    expect(importInput.safeParse(input).success).toBe(false);
    expect(importInput.safeParse({ ...input, rows: input.rows.slice(1) }).success).toBe(true);
  });
});
