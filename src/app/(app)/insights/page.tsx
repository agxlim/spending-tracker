import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { CalendarHeatmap } from "@/components/insights/calendar-heatmap";
import { CategoryBreakdown } from "@/components/insights/category-breakdown";
import { MonthCompare } from "@/components/insights/month-compare";
import { PaceChart } from "@/components/insights/pace-chart";
import { TopMerchants } from "@/components/insights/top-merchants";
import { MonthNav } from "@/components/transactions/month-filter";
import { budgetForMonth, dailyStatus, paceBudgetForMonth } from "@/lib/budget";
import { addMonths, dayOfMonth, monthEnd, monthStart, todayInTimeZone } from "@/lib/dates";
import { categoryBreakdown, compareToLastMonth, paceSeries, topMerchants } from "@/lib/insights";
import { getBudgets, getTransactions, requireProfile } from "@/lib/queries";
import { parseMonthParam } from "@/lib/transactions";

export const metadata: Metadata = { title: "Insights · Spending Tracker" };

function Card({ title, children }: { title: string; children: ReactNode }) {
  const id = `insight-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 id={id} className="text-sm font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

async function InsightsContent({ searchParams }: { searchParams: PageProps<"/insights">["searchParams"] }) {
  const { profile, today } = await requireProfile();
  const month = parseMonthParam((await searchParams).month, today);
  // For a past month, everything is measured through its last day.
  const through = month === monthStart(today) ? today : monthEnd(month);
  const firstActiveDay = todayInTimeZone(profile.timezone, new Date(profile.created_at));

  const [budgets, transactions] = await Promise.all([
    getBudgets(),
    getTransactions(addMonths(month, -1), monthEnd(month)),
  ]);
  const budget = budgetForMonth(budgets, month);
  const currency = profile.currency;

  return (
    <div className="flex flex-col gap-4">
      <MonthNav month={month} currentMonth={monthStart(today)} basePath="/insights" />
      {budget === null ? (
        <p className="text-sm text-muted-foreground">No budget was set for this month.</p>
      ) : (
        <>
          <Card title="Pace">
            <PaceChart
              points={paceSeries(budget, transactions, month, through)}
              currency={currency}
              throughDay={dayOfMonth(through)}
            />
          </Card>
          <Card title="Calendar">
            <CalendarHeatmap
              month={month}
              days={dailyStatus(paceBudgetForMonth(budgets, month), transactions, month, today, firstActiveDay)}
              currency={currency}
            />
          </Card>
        </>
      )}
      <Card title="Compared with last month">
        <MonthCompare
          comparison={compareToLastMonth(transactions, through)}
          throughDay={dayOfMonth(through)}
          currency={currency}
        />
      </Card>
      <Card title="By category">
        <CategoryBreakdown totals={categoryBreakdown(transactions, month)} currency={currency} />
      </Card>
      <Card title="Top merchants">
        <TopMerchants merchants={topMerchants(transactions, month)} currency={currency} />
      </Card>
    </div>
  );
}

export default function InsightsPage({ searchParams }: PageProps<"/insights">) {
  return (
    <main className="flex flex-1 flex-col p-4">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <InsightsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
