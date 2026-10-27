import { describe, expect, it } from "vitest";
import type { ColumnMapping } from "@/lib/csv/detect";
import type { MappedRow } from "@/lib/csv/parse";
import { buildPreview, dateRange, isMappingComplete, resolveMapping, rowsToImport } from "@/lib/csv/preview";

const ok = (index: number, occurredOn: string, amountCents: number, description: string): MappedRow => ({
  index,
  ok: true,
  occurredOn,
  amountCents,
  description,
});

const mapping: ColumnMapping = {
  date: "Date",
  description: "Description",
  amount: { kind: "single", column: "Amount", negativeIsSpending: true },
  dateFormat: "YYYY-MM-DD",
};

describe("buildPreview", () => {
  const mapped: MappedRow[] = [
    ok(0, "2026-10-01", 150_000, "RENT OCTOBER"),
    ok(1, "2026-10-02", 575, "POS 4421 STARBUCKS #1234"),
    { index: 2, ok: false, error: "Unrecognized date" },
    ok(3, "2026-10-03", -200_000, "PAYROLL DEPOSIT"),
    ok(4, "2026-10-04", 1_200, "Lunch"),
    ok(5, "2026-10-04", 1_200, "Lunch"),
    ok(6, "2026-10-05", 900, "Already logged"),
  ];
  const existing = [{ occurredOn: "2026-10-05", amountCents: 900, description: "Already logged" }];
  const preview = buildPreview(mapped, existing, { starbucks: "Dining" });

  it("separates unreadable rows", () => {
    expect(preview.errors).toEqual([{ index: 2, error: "Unrecognized date" }]);
    expect(preview.rows.map((r) => r.index)).toEqual([0, 1, 3, 4, 5, 6]);
  });

  it("assigns remembered categories, else Other", () => {
    expect(preview.rows.map((r) => r.category)).toEqual(["Other", "Dining", "Other", "Other", "Other", "Other"]);
  });

  it("flags duplicates and leaves them and money-in rows unticked", () => {
    expect(preview.rows.map((r) => [r.duplicate, r.include])).toEqual([
      [null, true],
      [null, true],
      [null, false], // payroll: money in
      [null, true],
      ["in-file", false],
      ["existing", false],
    ]);
  });

  it("truncates long descriptions", () => {
    const long = buildPreview([ok(0, "2026-10-01", 100, "x".repeat(250))], [], {});
    expect(long.rows[0].description).toHaveLength(200);
  });
});

describe("rowsToImport", () => {
  it("sends only ticked, non-duplicate rows with their edits", () => {
    const { rows } = buildPreview(
      [ok(0, "2026-10-01", 150_000, "Rent"), ok(1, "2026-10-02", -1_299, "Refund"), ok(2, "2026-10-03", 500, "Coffee")],
      [],
      {},
    );
    rows[0] = { ...rows[0], isOneOff: true, category: "Bills" };
    rows[1] = { ...rows[1], include: true };
    rows[2] = { ...rows[2], include: false };
    expect(rowsToImport(rows)).toEqual([
      { occurredOn: "2026-10-01", amountCents: 150_000, description: "Rent", category: "Bills", isOneOff: true },
      { occurredOn: "2026-10-02", amountCents: -1_299, description: "Refund", category: "Other", isOneOff: false },
    ]);
  });

  it("never sends duplicates even if ticked", () => {
    const { rows } = buildPreview([ok(0, "2026-10-01", 100, "A"), ok(1, "2026-10-01", 100, "A")], [], {});
    rows[1] = { ...rows[1], include: true };
    expect(rowsToImport(rows)).toHaveLength(1);
  });
});

describe("mappings", () => {
  const headers = ["Date", "Description", "Amount"];

  it("checks every field is set and exists in the file", () => {
    expect(isMappingComplete(mapping, headers)).toBe(true);
    expect(isMappingComplete({ ...mapping, description: "" }, headers)).toBe(false);
    expect(isMappingComplete(mapping, ["Date", "Description", "Value"])).toBe(false);
  });

  it("reuses a saved mapping that fits, otherwise guesses", () => {
    const saved = { ...mapping, amount: { kind: "single", column: "Amount", negativeIsSpending: false } };
    expect(resolveMapping(saved, headers, [])).toEqual(saved);
    expect(resolveMapping(saved, ["Posted Date", "Payee", "Debit", "Credit"], [])).toMatchObject({
      date: "Posted Date",
      amount: { kind: "split", debit: "Debit", credit: "Credit" },
    });
    expect(resolveMapping({ nonsense: true }, headers, []).date).toBe("Date");
    expect(resolveMapping(null, headers, []).description).toBe("Description");
  });
});

describe("dateRange", () => {
  it("finds the earliest and latest readable dates", () => {
    expect(
      dateRange([ok(0, "2026-10-05", 1, ""), { index: 1, ok: false, error: "x" }, ok(2, "2026-09-28", 1, "")]),
    ).toEqual({ from: "2026-09-28", to: "2026-10-05" });
    expect(dateRange([])).toBeNull();
  });
});
