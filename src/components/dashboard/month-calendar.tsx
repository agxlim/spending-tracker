"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarHeatmap, STATUS } from "@/components/insights/calendar-heatmap";
import type { DailyStatus } from "@/lib/budget";
import type { ISODate } from "@/lib/dates";
import { dayLabel, money, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

// What one day looked like against its streak target.
function dayDetail(day: DailyStatus, today: ISODate, currency: string): string {
  const spent = money(day.spent, currency);
  const target = money(day.allowance, currency);
  switch (day.status) {
    case "under":
      return `Spent ${spent} of ${target}.`;
    case "over":
      return `Spent ${spent} of ${target}, ${money(day.spent - day.allowance, currency)} over.`;
    case "nospend":
      return "Nothing spent, not counting one-offs.";
    case "inactive":
      return "Before you started tracking.";
    case "future":
      return day.date === today
        ? `Spent ${spent} of ${target} so far. Counts once the day ends.`
        : "Its target is set on the day, from what's left by then.";
  }
}

export function MonthCalendar({ days, today, currency }: { days: DailyStatus[]; today: ISODate; currency: string }) {
  const [selected, setSelected] = useState<ISODate>(today);
  const day = days.find((d) => d.date === selected);
  // Today and days before signup are fully explained by the detail line.
  const status = day && (day.date === today || day.status === "inactive" ? null : STATUS[day.status]);

  return (
    <section aria-labelledby="calendar-heading" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 id="calendar-heading" className="text-sm font-medium">
        {monthLabel(today)}
      </h2>
      <CalendarHeatmap month={today} days={days} currency={currency} selected={selected} onSelect={setSelected} />
      {day && (
        <div aria-live="polite" className="flex flex-col gap-1 rounded-lg bg-muted p-3 text-sm">
          <p className="flex items-baseline justify-between gap-2">
            <span className="font-medium">{day.date === today ? `Today, ${dayLabel(day.date)}` : dayLabel(day.date)}</span>
            {status && (
              <span className={cn("text-xs", day.status === "over" ? "text-destructive" : "text-muted-foreground")}>
                {status.label}
              </span>
            )}
          </p>
          <p className="text-muted-foreground">{dayDetail(day, today, currency)}</p>
          <Link href={`/transactions?month=${today.slice(0, 7)}`} className="self-start text-sm underline underline-offset-4">
            See this month&apos;s transactions
          </Link>
        </div>
      )}
    </section>
  );
}
