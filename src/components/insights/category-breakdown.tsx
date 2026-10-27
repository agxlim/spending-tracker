import { money } from "@/lib/format";
import type { CategoryTotal } from "@/lib/insights";

/** Single-series horizontal bars, every value labelled, so the list doubles as the text view. */
export function CategoryBreakdown({ totals, currency }: { totals: CategoryTotal[]; currency: string }) {
  const max = Math.max(1, ...totals.map((t) => t.totalCents));
  if (totals.length === 0) return <p className="text-sm text-muted-foreground">No spending yet.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {totals.map(({ category, totalCents }) => (
        <li key={category} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span>{category}</span>
            <span className="tabular-nums">{money(totalCents, currency)}</span>
          </div>
          <div className="h-3" aria-hidden>
            <div
              className="h-full rounded-r bg-chart-1"
              style={{ width: `${(Math.max(0, totalCents) / max) * 100}%`, maxWidth: "100%" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
