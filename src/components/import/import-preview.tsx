"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { CATEGORIES, type Category } from "@/lib/categories";
import type { PreviewRow } from "@/lib/csv/preview";
import { dayLabel, money } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE = 100;

export function ImportPreview({
  rows,
  currency,
  onChange,
}: {
  rows: PreviewRow[];
  currency: string;
  onChange: (rows: PreviewRow[]) => void;
}) {
  const [shown, setShown] = useState(PAGE);
  const update = (i: number, patch: Partial<PreviewRow>) =>
    onChange(rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y rounded-xl border bg-card">
        {rows.slice(0, shown).map((row, i) => {
          const disabled = row.duplicate !== null;
          return (
            <li key={row.index} className={cn("flex flex-col gap-2 px-4 py-3", disabled && "opacity-60")}>
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={row.include}
                  disabled={disabled}
                  onChange={(e) => update(i, { include: e.target.checked })}
                  aria-label={`Import ${row.description || "row"} on ${dayLabel(row.occurredOn)}`}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.description || "No description"}</p>
                  <p className="text-xs text-muted-foreground">
                    {dayLabel(row.occurredOn)}
                    {row.duplicate === "existing" && " · Already imported, will be skipped"}
                    {row.duplicate === "in-file" && " · Duplicate row in this file, will be skipped"}
                    {!row.duplicate && row.amountCents < 0 && " · Money in: tick only if it's a refund"}
                  </p>
                </div>
                <span className={cn("text-sm tabular-nums", row.amountCents < 0 && "text-success")}>
                  {money(row.amountCents, currency)}
                </span>
              </div>
              {!disabled && row.include && (
                <div className="flex items-center gap-3 pl-8">
                  <Select
                    aria-label="Category"
                    value={row.category}
                    onChange={(e) => update(i, { category: e.target.value as Category })}
                    className="h-9 flex-1 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={row.isOneOff} onChange={(e) => update(i, { isOneOff: e.target.checked })} />
                    One-off
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {shown < rows.length && (
        <Button variant="outline" onClick={() => setShown(shown + PAGE)}>
          Show more ({rows.length - shown} left)
        </Button>
      )}
    </div>
  );
}
