import { describe, expect, it } from "vitest";
import { bpsToPercentString, centsToDecimalString, formatCents, parseCents, parsePercentBps } from "@/lib/money";

describe("parseCents", () => {
  it.each([
    ["12.34", 1234],
    ["12.3", 1230],
    ["12", 1200],
    ["12.", 1200],
    [".5", 50],
    ["0.07", 7],
    ["-5", -500],
    ["+5.00", 500],
    ["$1,234.56", 123456],
    ["-$1,234.56", -123456],
    ["(12.00)", -1200],
    ["12.34-", -1234],
    ["1.234,56", 123456],
    ["12,5", 1250],
    ["€ 3,50", 350],
    ["USD 12.00", 1200],
    ["12.00 EUR", 1200],
    ["  42.10 ", 4210],
    ["0", 0],
    ["-0.00", 0],
  ])("parses %j as %i", (input, expected) => {
    expect(parseCents(input)).toBe(expected);
  });

  it.each(["", "abc", ".", "1.234", "12.345", "--5", "-5-", "1e3", "12abc34", "USD"])("rejects %j", (input) => {
    expect(parseCents(input)).toBeNull();
  });

  it("never loses a cent to floating point", () => {
    expect(parseCents("0.29")).toBe(29);
    expect(parseCents("1.15")).toBe(115);
    expect(parseCents("4.35")).toBe(435);
  });
});

describe("formatting", () => {
  it("builds decimal strings from cents", () => {
    expect(centsToDecimalString(123456)).toBe("1234.56");
    expect(centsToDecimalString(5)).toBe("0.05");
    expect(centsToDecimalString(-250)).toBe("-2.50");
  });

  it("formats currency", () => {
    expect(formatCents(123456, "USD", "en-US")).toBe("$1,234.56");
    expect(formatCents(-250, "USD", "en-US")).toBe("-$2.50");
    expect(formatCents(1050, "EUR", "de-DE")).toBe("10,50 €");
  });
});

describe("parsePercentBps", () => {
  it.each([
    ["10", 1000],
    ["12.5", 1250],
    ["7.25%", 725],
    [" 0 ", 0],
    ["100", 10_000],
  ])("parses %s", (input, expected) => {
    expect(parsePercentBps(input)).toBe(expected);
  });

  it.each(["", "-5", "abc", "1.234", "1000", ".", "10%%"])("rejects %j", (input) => {
    expect(parsePercentBps(input)).toBeNull();
  });
});

describe("bpsToPercentString", () => {
  it.each([
    [1000, "10"],
    [1250, "12.5"],
    [725, "7.25"],
    [5, "0.05"],
    [0, "0"],
  ])("formats %i as %s", (bps, expected) => {
    expect(bpsToPercentString(bps)).toBe(expected);
  });

  it("round-trips through parsePercentBps", () => {
    for (const bps of [0, 1, 99, 100, 1250, 9000]) expect(parsePercentBps(bpsToPercentString(bps))).toBe(bps);
  });
});
