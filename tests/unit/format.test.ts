import { describe, expect, it } from "vitest";
import { percent, weekdayLabel } from "@/lib/format";

describe("percent", () => {
  it("shows basis points to one decimal place, keeping the sign", () => {
    expect(percent(2_500)).toBe("25%");
    expect(percent(6_666)).toBe("66.6%");
    expect(percent(-2_550)).toBe("-25.5%");
    expect(percent(-5)).toBe("0%");
    expect(percent(0)).toBe("0%");
  });
});

describe("weekdayLabel", () => {
  it("names the weekday of a calendar date", () => {
    expect(weekdayLabel("2026-10-27")).toBe("Tue");
  });
});
