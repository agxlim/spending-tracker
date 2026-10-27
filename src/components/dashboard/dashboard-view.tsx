"use client";

import { useOptimistic, useState, useTransition } from "react";
import { saveTransaction } from "@/app/(app)/transactions/actions";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Budget, Txn } from "@/lib/budget";
import type { Category } from "@/lib/categories";
import { dashboardSummary } from "@/lib/dashboard";
import type { ISODate } from "@/lib/dates";
import type { TransactionInput } from "@/lib/schemas";
import { BudgetProgress } from "./budget-progress";
import { MonthCalendar } from "./month-calendar";
import { SafeToSpend } from "./safe-to-spend";
import { SavingsRate } from "./savings-rate";
import { StreakCard } from "./streak-card";

export function DashboardView({
  today,
  firstActiveDay,
  currency,
  budgets,
  transactions,
  remembered,
}: {
  today: ISODate;
  firstActiveDay: ISODate;
  currency: string;
  budgets: Budget[];
  transactions: Txn[];
  remembered: Record<string, Category>;
}) {
  const [optimisticTxns, addOptimistic] = useOptimistic(transactions, (current: Txn[], added: Txn) => [
    ...current,
    added,
  ]);
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = dashboardSummary(budgets, optimisticTxns, firstActiveDay, today);

  // Close the sheet and update the numbers straight away; the save finishes in
  // the background and the server's data replaces the optimistic entry.
  function quickAdd(input: TransactionInput) {
    setAdding(false);
    setError(null);
    startTransition(async () => {
      addOptimistic({ occurredOn: input.occurredOn, amountCents: input.amountCents, isOneOff: input.isOneOff });
      const result = await saveTransaction(null, input);
      if (!result.ok) setError(`Couldn't save that transaction: ${result.error}`);
    });
  }

  if (!summary) {
    return <p className="p-4 text-sm text-muted-foreground">Set a budget in Settings to see your numbers.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SafeToSpend summary={summary} currency={currency} />
      {error && (
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button size="lg" onClick={() => setAdding(true)}>
        Add spending
      </Button>
      <BudgetProgress summary={summary} currency={currency} />
      <SavingsRate summary={summary} currency={currency} />
      <StreakCard summary={summary} currency={currency} />
      <MonthCalendar days={summary.monthDays} today={today} currency={currency} />

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add spending">
        {adding && (
          <TransactionForm
            today={today}
            remembered={remembered}
            onDone={() => setAdding(false)}
            onSubmit={quickAdd}
          />
        )}
      </Dialog>
    </div>
  );
}
