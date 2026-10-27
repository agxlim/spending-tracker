import type { DailyStatus, DayStatus } from "@/lib/budget";
import { dayLabel, money } from "@/lib/format";
import { calendarWeeks } from "@/lib/insights";
import type { ISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";

// Status is carried by fill, icon and label together, never by color alone.
const STATUS: Record<DayStatus, { label: string; icon: string; className: string }> = {
  under: { label: "Under pace", icon: "✓", className: "bg-status-good text-[#0b0b0b]" },
  nospend: { label: "No-spend day", icon: "★", className: "bg-status-good-soft text-[#0b0b0b]" },
  over: { label: "Over pace", icon: "✕", className: "bg-status-critical text-white" },
  future: { label: "Not finished yet", icon: "", className: "bg-muted text-muted-foreground" },
  inactive: { label: "Before you started", icon: "", className: "bg-muted/50 text-muted-foreground" },
};
const LEGEND: DayStatus[] = ["under", "nospend", "over"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarHeatmap({
  month,
  days,
  currency,
}: {
  month: ISODate;
  days: DailyStatus[];
  currency: string;
}) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const counts = Object.fromEntries(LEGEND.map((s) => [s, days.filter((d) => d.status === s).length]));

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full table-fixed border-separate border-spacing-0.5">
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col" className="pb-1 text-xs font-normal text-muted-foreground">
                <abbr title={w} className="no-underline">
                  {w[0]}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendarWeeks(month).map((week, i) => (
            <tr key={i}>
              {week.map((date, j) => {
                const day = date ? byDate.get(date) : undefined;
                if (!date || !day) return <td key={j} />;
                const status = STATUS[day.status];
                const detail =
                  day.status === "under" || day.status === "over"
                    ? `, spent ${money(day.spent, currency)} of ${money(day.allowance, currency)}`
                    : "";
                const description = `${dayLabel(date)}: ${status.label}${detail}`;
                return (
                  <td key={j} className="p-0">
                    <div
                      title={description}
                      aria-label={description}
                      role="img"
                      className={cn("flex aspect-square flex-col items-center justify-center rounded-md text-xs", status.className)}
                    >
                      <span className="tabular-nums">{Number(date.slice(8))}</span>
                      <span aria-hidden className="text-[0.65rem] leading-none">
                        {status.icon}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {LEGEND.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("flex size-4 items-center justify-center rounded text-[0.6rem]", STATUS[s].className)}>
              {STATUS[s].icon}
            </span>
            {STATUS[s].label}: <span className="font-medium tabular-nums">{counts[s]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
