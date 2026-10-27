import type { DashboardSummary } from "@/lib/dashboard";
import { money } from "@/lib/format";
import { bpsToPercentString } from "@/lib/money";

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export function StreakCard({ summary, currency }: { summary: DashboardSummary; currency: string }) {
  const { streaks } = summary;
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
      <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Best</dt>
          <dd className="font-medium tabular-nums">{days(streaks.best)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">No-spend days</dt>
          <dd className="font-medium tabular-nums">{streaks.noSpendThisMonth}</dd>
        </div>
      </dl>
    </section>
  );
}
