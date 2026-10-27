import Link from "next/link";
import type { DashboardSummary } from "@/lib/dashboard";
import { money, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SavingsRate({ summary, currency }: { summary: DashboardSummary; currency: string }) {
  const { incomeCents, savingsRateSoFarBps, plannedSavingsRateBps, spentThisMonthCents } = summary;

  return (
    <section aria-labelledby="savings-heading" className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <h2 id="savings-heading" className="text-sm font-medium">
        Savings rate
      </h2>
      {incomeCents === null || savingsRateSoFarBps === null || plannedSavingsRateBps === null ? (
        <p className="text-sm text-muted-foreground">
          <Link href="/settings" className="underline underline-offset-4">
            Add your monthly income
          </Link>{" "}
          to see how much of it you&apos;re keeping.
        </p>
      ) : (
        <>
          <p className={cn("text-2xl font-semibold tabular-nums", savingsRateSoFarBps < 0 && "text-destructive")}>
            {percent(savingsRateSoFarBps)}
          </p>
          <p className="text-sm text-muted-foreground">
            {savingsRateSoFarBps < 0
              ? `Spent ${money(spentThisMonthCents - incomeCents, currency)} more than your ${money(incomeCents, currency)} income this month.`
              : `of your ${money(incomeCents, currency)} income left after this month's spending so far.`}
          </p>
          <p className="text-sm">
            Spending the whole budget would save{" "}
            <span className={cn("font-medium tabular-nums", plannedSavingsRateBps < 0 && "text-destructive")}>
              {percent(plannedSavingsRateBps)}
            </span>
            .
          </p>
        </>
      )}
    </section>
  );
}
