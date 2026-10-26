import { describe, expect, it } from "vitest";
import { merchantKey } from "@/lib/merchant";

describe("merchantKey", () => {
  it.each([
    ["POS 4421 STARBUCKS #1234", "starbucks"],
    ["SQ *BLUE BOTTLE", "blue bottle"],
    ["sq*Blue Bottle", "blue bottle"],
    ["DEBIT NETFLIX.COM", "netflix com"],
    ["POS DEBIT 0099 TRADER JOE'S #552", "trader joe s"],
    ["UBER   TRIP", "uber trip"],
    ["Posh Nails", "posh nails"],
    ["Debitel Mobile", "debitel mobile"],
    ["Café Olé 22", "café olé"],
    ["  ", ""],
  ])("%j → %j", (input, expected) => {
    expect(merchantKey(input)).toBe(expected);
  });

  it("gives the same key for the same merchant at different stores", () => {
    expect(merchantKey("STARBUCKS #1234")).toBe(merchantKey("POS STARBUCKS #99"));
  });
});
