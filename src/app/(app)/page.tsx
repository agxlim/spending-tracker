import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { monthEnd, monthStart, todayInTimeZone } from "@/lib/dates";
import { getBudgets, getMerchantCategories, getTransactions, requireProfile } from "@/lib/queries";

async function DashboardContent() {
  const { profile, today } = await requireProfile();
  // Streaks start on the signup day (in the user's timezone) and run to today.
  const firstActiveDay = todayInTimeZone(profile.timezone, new Date(profile.created_at));
  const [budgets, transactions, remembered] = await Promise.all([
    getBudgets(),
    getTransactions(monthStart(firstActiveDay), monthEnd(today)),
    getMerchantCategories(),
  ]);
  return (
    <DashboardView
      today={today}
      firstActiveDay={firstActiveDay}
      currency={profile.currency}
      budgets={budgets}
      transactions={transactions.map(({ occurredOn, amountCents, isOneOff }) => ({ occurredOn, amountCents, isOneOff }))}
      remembered={remembered}
    />
  );
}

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col p-4">
      <h1 className="sr-only">Dashboard</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
