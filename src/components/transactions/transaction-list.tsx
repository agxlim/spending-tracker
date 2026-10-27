import { dayLabel, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DayGroup, Transaction } from "@/lib/transactions";

export function TransactionList({
  groups,
  currency,
  onSelect,
}: {
  groups: DayGroup[];
  currency: string;
  onSelect: (t: Transaction) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.date} aria-label={dayLabel(group.date)}>
          <div className="flex justify-between px-1 pb-1 text-xs font-medium text-muted-foreground">
            <h3>{dayLabel(group.date)}</h3>
            <span>{money(group.totalCents, currency)}</span>
          </div>
          <ul className="divide-y rounded-xl border bg-card">
            {group.items.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.description || "No description"}</p>
                    <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      <span>{t.category}</span>
                      {t.isOneOff && <span className="font-medium text-warning">One-off</span>}
                      {t.source === "csv" && <span>Imported</span>}
                    </p>
                  </div>
                  <span className={cn("tabular-nums", t.amountCents < 0 && "text-success")}>
                    {money(t.amountCents, currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
