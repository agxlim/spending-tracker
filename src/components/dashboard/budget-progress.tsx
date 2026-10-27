import { money } from "@/lib/format";
import type { DashboardSummary } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export function BudgetProgress({ summary, currency }: { summary: DashboardSummary; currency: string }) {
  const { budgetCents, spentThisMonthCents, remainingThisMonthCents, oneOffsThisMonthCents } = summary;
  const percent = Math.min(100, Math.max(0, (spentThisMonthCents / budgetCents) * 100));
  const over = remainingThisMonthCents < 0;
  const aheadOfPace = percent > summary.pacePercent;

  return (
    <section aria-labelledby="month-heading" className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 id="month-heading" className="text-sm font-medium">
          This month
        </h2>
        <p className="text-sm text-muted-foreground">
          {summary.daysLeft} {summary.daysLeft === 1 ? "day" : "days"} left
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Spent of monthly budget"
        aria-valuemin={0}
        aria-valuemax={budgetCents}
        aria-valuenow={Math.max(0, spentThisMonthCents)}
        aria-valuetext={`${money(spentThisMonthCents, currency)} of ${money(budgetCents, currency)}`}
        className="relative h-3 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full", over ? "bg-destructive" : aheadOfPace ? "bg-warning" : "bg-success")}
          style={{ width: `${percent}%` }}
        />
        {/* Where spending would be at an even pace by the end of today */}
        <div
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-foreground/60"
          style={{ left: `calc(${summary.pacePercent}% - 1px)` }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <span>
          <span className="font-semibold tabular-nums">{money(spentThisMonthCents, currency)}</span>
          <span className="text-muted-foreground"> of {money(budgetCents, currency)}</span>
        </span>
        <span className={cn("tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
          {over
            ? `${money(-remainingThisMonthCents, currency)} over`
            : `${money(remainingThisMonthCents, currency)} left`}
        </span>
      </div>
      {oneOffsThisMonthCents !== 0 && (
        <p className="text-xs text-muted-foreground">Includes {money(oneOffsThisMonthCents, currency)} of one-offs</p>
      )}
    </section>
  );
}
