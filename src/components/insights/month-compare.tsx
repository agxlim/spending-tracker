import { money } from "@/lib/format";
import type { MonthComparison } from "@/lib/insights";

export function MonthCompare({
  comparison,
  throughDay,
  currency,
}: {
  comparison: MonthComparison;
  throughDay: number;
  currency: string;
}) {
  const { thisMonthCents, lastMonthCents, differenceCents } = comparison;
  const verdict =
    differenceCents === 0
      ? "Same as last month"
      : differenceCents < 0
        ? `▼ ${money(-differenceCents, currency)} less than last month`
        : `▲ ${money(differenceCents, currency)} more than last month`;
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted p-3">
          <dt className="text-xs text-muted-foreground">This month</dt>
          <dd className="text-xl font-semibold">{money(thisMonthCents, currency)}</dd>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Last month</dt>
          <dd className="text-xl font-semibold">{money(lastMonthCents, currency)}</dd>
        </div>
      </dl>
      <p className="text-sm">
        {verdict} <span className="text-muted-foreground">(days 1–{throughDay})</span>
      </p>
    </div>
  );
}
