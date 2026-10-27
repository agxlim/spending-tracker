import { STATUS } from "@/components/insights/calendar-heatmap";
import type { DailyStatus, DayStatus } from "@/lib/budget";
import type { DashboardSummary } from "@/lib/dashboard";
import { dayLabel, money, weekdayLabel } from "@/lib/format";
import { bpsToPercentString } from "@/lib/money";
import { cn } from "@/lib/utils";

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

// Short words for each finished-day status, as the streak card names them.
const KIND: Partial<Record<DayStatus, string>> = { under: "Underspent", over: "Overspent", nospend: "No spend" };

function dayDescription(day: DailyStatus, currency: string): string {
  const detail =
    day.status === "under" || day.status === "over"
      ? `, spent ${money(day.spent, currency)} of ${money(day.allowance, currency)}`
      : "";
  return `${dayLabel(day.date)}: ${KIND[day.status]}${detail}`;
}

export function StreakCard({ summary, currency }: { summary: DashboardSummary; currency: string }) {
  const { streaks, recentDays } = summary;
  const monthCounts: { status: DayStatus; count: number }[] = [
    { status: "under", count: streaks.underThisMonth },
    { status: "over", count: streaks.overThisMonth },
    { status: "nospend", count: streaks.noSpendThisMonth },
  ];

  return (
    <section aria-labelledby="streak-heading" className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <h2 id="streak-heading" className="text-sm font-medium">
        Streak
      </h2>
      <p className="text-2xl font-semibold tabular-nums">{days(streaks.current)}</p>
      <p className="text-sm text-muted-foreground">
        {streaks.current === 0
          ? `Stay under today's ${summary.savingsRateBps > 0 ? "streak target" : "number"} to start one.`
          : "In a row under pace. Today counts once it's over."}
      </p>
      {summary.savingsRateBps > 0 && (
        <p className="text-sm">
          Streak target today:{" "}
          <span className="font-medium tabular-nums">{money(summary.streakTargetCents, currency)}</span>
          <span className="text-muted-foreground"> · saving {bpsToPercentString(summary.savingsRateBps)}%</span>
        </p>
      )}

      {recentDays.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">Last {days(recentDays.length)}</h3>
          <ol className="grid grid-cols-7 gap-1">
            {recentDays.map((day) => (
              <li
                key={day.date}
                title={dayDescription(day, currency)}
                className="flex flex-col items-center gap-1 text-xs"
              >
                <span className="text-muted-foreground" aria-hidden>
                  {weekdayLabel(day.date)}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md font-medium",
                    STATUS[day.status].className,
                  )}
                >
                  {STATUS[day.status].icon}
                </span>
                <span className="tabular-nums" aria-hidden>
                  {Number(day.date.slice(8))}
                </span>
                <span className="sr-only">{dayDescription(day, currency)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Best</dt>
          <dd className="font-medium tabular-nums">{days(streaks.best)}</dd>
        </div>
        {monthCounts.map(({ status, count }) => (
          <div key={status}>
            <dt className="flex items-center gap-1 text-muted-foreground">
              <span
                aria-hidden
                className={cn("inline-flex size-4 items-center justify-center rounded text-[10px]", STATUS[status].className)}
              >
                {STATUS[status].icon}
              </span>
              {KIND[status]} days
            </dt>
            <dd className="font-medium tabular-nums">{count}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">Day counts are for this month.</p>
    </section>
  );
}
