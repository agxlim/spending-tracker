import { money } from "@/lib/format";
import type { DashboardSummary } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export function SafeToSpend({ summary, currency }: { summary: DashboardSummary; currency: string }) {
  const over = summary.leftTodayCents < 0;
  return (
    <section aria-labelledby="safe-heading" className="flex flex-col items-center gap-1 py-6 text-center">
      <h2 id="safe-heading" className="text-sm font-medium text-muted-foreground">
        Safe to spend today
      </h2>
      <p className="text-5xl font-semibold tabular-nums tracking-tight">
        {money(summary.safeToSpendCents, currency)}
      </p>
      <p className={cn("text-sm", over ? "text-destructive" : "text-muted-foreground")}>
        {summary.spentTodayCents === 0
          ? "Nothing spent yet today"
          : over
            ? `${money(-summary.leftTodayCents, currency)} over today`
            : `${money(summary.spentTodayCents, currency)} spent · ${money(summary.leftTodayCents, currency)} left today`}
      </p>
    </section>
  );
}
