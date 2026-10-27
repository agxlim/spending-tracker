import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dayOfMonth,
  daysInMonth,
  eachDay,
  isValidISODate,
  isValidTimeZone,
  monthEnd,
  monthStart,
  todayInTimeZone,
} from "@/lib/dates";

describe("todayInTimeZone", () => {
  const instant = new Date("2026-10-27T03:30:00Z");

  it("uses the user's timezone, not UTC", () => {
    expect(todayInTimeZone("America/New_York", instant)).toBe("2026-10-26");
    expect(todayInTimeZone("UTC", instant)).toBe("2026-10-27");
    expect(todayInTimeZone("Asia/Tokyo", instant)).toBe("2026-10-27");
  });

  it("handles extreme offsets", () => {
    const t = new Date("2026-10-26T11:00:00Z");
    expect(todayInTimeZone("Pacific/Kiritimati", t)).toBe("2026-10-27"); // UTC+14
    expect(todayInTimeZone("Pacific/Pago_Pago", t)).toBe("2026-10-26"); // UTC-11
  });

  it("handles year boundaries and DST changes", () => {
    expect(todayInTimeZone("America/Los_Angeles", new Date("2027-01-01T04:00:00Z"))).toBe("2026-12-31");
    // US DST starts 2026-03-08 at 2am local
    expect(todayInTimeZone("America/New_York", new Date("2026-03-08T07:30:00Z"))).toBe("2026-03-08");
    expect(todayInTimeZone("America/New_York", new Date("2026-03-08T04:59:00Z"))).toBe("2026-03-07");
  });
});

describe("calendar arithmetic", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("knows month lengths including leap years", () => {
    expect(daysInMonth("2026-10-15")).toBe(31);
    expect(daysInMonth("2026-11-01")).toBe(30);
    expect(daysInMonth("2027-02-10")).toBe(28);
    expect(daysInMonth("2028-02-10")).toBe(29);
    expect(daysInMonth("2100-02-01")).toBe(28);
    expect(daysInMonth("2000-02-01")).toBe(29);
  });

  it("computes month boundaries", () => {
    expect(monthStart("2026-10-26")).toBe("2026-10-01");
    expect(monthEnd("2028-02-03")).toBe("2028-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-01");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-01");
    expect(dayOfMonth("2026-10-09")).toBe(9);
  });

  it("lists days inclusively", () => {
    expect(eachDay("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
    expect(eachDay("2026-10-02", "2026-10-01")).toEqual([]);
  });
});

describe("validation", () => {
  it("rejects impossible dates", () => {
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("2026-1-01")).toBe(false);
  });

  it("checks IANA timezones", () => {
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});
