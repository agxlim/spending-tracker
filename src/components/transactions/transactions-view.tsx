"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Category } from "@/lib/categories";
import { monthStart, type ISODate } from "@/lib/dates";
import { money } from "@/lib/format";
import { filterTransactions, groupByDay, type Transaction, type TransactionFilter } from "@/lib/transactions";
import { FilterBar, MonthNav } from "./month-filter";
import { TransactionForm } from "./transaction-form";
import { TransactionList } from "./transaction-list";

type Editing = { mode: "closed" } | { mode: "new" } | { mode: "edit"; transaction: Transaction };

export function TransactionsView({
  month,
  today,
  currency,
  transactions,
  remembered,
}: {
  month: ISODate;
  today: ISODate;
  currency: string;
  transactions: Transaction[];
  remembered: Record<string, Category>;
}) {
  const [filter, setFilter] = useState<TransactionFilter>({ category: "all", query: "", oneOffsOnly: false });
  const [editing, setEditing] = useState<Editing>({ mode: "closed" });

  const shown = filterTransactions(transactions, filter);
  const total = shown.reduce((sum, t) => sum + t.amountCents, 0);
  const close = () => setEditing({ mode: "closed" });
  // New entries default to today, or the 1st when browsing a past month.
  const defaultDate = month === monthStart(today) ? today : month;

  return (
    <div className="flex flex-col gap-4">
      <MonthNav month={month} currentMonth={monthStart(today)} />
      <FilterBar filter={filter} onChange={setFilter} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {shown.length} {shown.length === 1 ? "transaction" : "transactions"} ·{" "}
          <span className="font-medium text-foreground">{money(total, currency)}</span>
        </p>
        <Button size="sm" onClick={() => setEditing({ mode: "new" })}>
          Add
        </Button>
      </div>

      {shown.length > 0 ? (
        <TransactionList
          groups={groupByDay(shown)}
          currency={currency}
          onSelect={(transaction) => setEditing({ mode: "edit", transaction })}
        />
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {transactions.length === 0 ? "No transactions this month yet." : "Nothing matches these filters."}
        </p>
      )}

      <Dialog
        open={editing.mode !== "closed"}
        onClose={close}
        title={editing.mode === "edit" ? "Edit transaction" : "Add transaction"}
      >
        {editing.mode !== "closed" && (
          <TransactionForm
            key={editing.mode === "edit" ? editing.transaction.id : "new"}
            transaction={editing.mode === "edit" ? editing.transaction : undefined}
            today={defaultDate}
            remembered={remembered}
            onDone={close}
          />
        )}
      </Dialog>
    </div>
  );
}
