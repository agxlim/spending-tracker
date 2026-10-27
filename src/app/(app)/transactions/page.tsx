import type { Metadata } from "next";
import { Suspense } from "react";
import { TransactionsView } from "@/components/transactions/transactions-view";
import { monthEnd } from "@/lib/dates";
import { getMerchantCategories, getTransactions, requireProfile } from "@/lib/queries";
import { parseMonthParam } from "@/lib/transactions";

export const metadata: Metadata = { title: "Transactions · Spending Tracker" };

async function TransactionsContent({ searchParams }: { searchParams: PageProps<"/transactions">["searchParams"] }) {
  const { profile, today } = await requireProfile();
  const month = parseMonthParam((await searchParams).month, today);
  const [transactions, remembered] = await Promise.all([
    getTransactions(month, monthEnd(month)),
    getMerchantCategories(),
  ]);
  return (
    <TransactionsView
      key={month}
      month={month}
      today={today}
      currency={profile.currency}
      transactions={transactions}
      remembered={remembered}
    />
  );
}

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    <main className="flex flex-1 flex-col p-4">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <TransactionsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
