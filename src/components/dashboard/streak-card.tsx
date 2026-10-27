import type { Streaks } from "@/lib/streaks";

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export function StreakCard({ streaks }: { streaks: Streaks }) {
  return (
    <section aria-labelledby="streak-heading" className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <h2 id="streak-heading" className="text-sm font-medium">
        Streak
      </h2>
      <p className="text-2xl font-semibold tabular-nums">{days(streaks.current)}</p>
      <p className="text-sm text-muted-foreground">
        {streaks.current === 0
          ? "Stay under today's number to start one."
          : "In a row under pace. Today counts once it's over."}
      </p>
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
