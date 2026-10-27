"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactMoney, money } from "@/lib/format";
import type { PacePoint } from "@/lib/insights";

interface Row {
  day: number;
  ideal: number;
  regular: number | null;
  total: number | null; // regular + one-offs
}

const SERIES = {
  total: { label: "Spending incl. one-offs", color: "var(--chart-2)" },
  regular: { label: "Regular spending", color: "var(--chart-1)" },
  ideal: { label: "Even pace", color: "var(--chart-reference)" },
} as const;

function SeriesKey({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <svg width="16" height="8" aria-hidden className="shrink-0">
      <line x1="0" y1="4" x2="16" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "3 3" : undefined} />
    </svg>
  );
}

function PaceTooltip({
  active,
  payload,
  label,
  currency,
  hasOneOffs,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  label?: string | number;
  currency: string;
  hasOneOffs: boolean;
}) {
  const row = payload?.[0]?.payload as Row | undefined;
  if (!active || !row) return null;
  const keys = (hasOneOffs ? (["total", "regular", "ideal"] as const) : (["regular", "ideal"] as const)).filter(
    (k) => row[k] !== null,
  );
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">Day {label}</p>
      {keys.map((k) => (
        <p key={k} className="flex items-center gap-2">
          <SeriesKey color={SERIES[k].color} dashed={k === "ideal"} />
          <span className="text-muted-foreground">{SERIES[k].label}</span>
          <span className="ml-auto pl-3 tabular-nums">{money(row[k]!, currency)}</span>
        </p>
      ))}
    </div>
  );
}

export function PaceChart({
  points,
  currency,
  throughDay,
}: {
  points: PacePoint[];
  currency: string;
  throughDay: number;
}) {
  const hasOneOffs = points.some((p) => p.oneOffCents);
  const rows: Row[] = points.map((p, i) => ({
    day: i + 1,
    ideal: p.idealCents,
    regular: p.regularCents,
    total: p.regularCents === null ? null : p.regularCents + (p.oneOffCents ?? 0),
  }));
  const latest = rows[throughDay - 1];
  const lastDay = rows.length;

  // Only the latest point gets a marker: the end of each line.
  const endDot = (color: string) =>
    function EndDot(props: { cx?: number; cy?: number; index?: number }) {
      if (props.index !== throughDay - 1 || props.cx === undefined || props.cy === undefined) return <g key={props.index} />;
      return <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="var(--card)" strokeWidth={2} />;
    };

  return (
    <figure className="flex flex-col gap-3">
      {/* Legend with each series' latest value doubles as the direct labels. */}
      <ul className="flex flex-col gap-1 text-sm">
        {hasOneOffs && (
          <li className="flex items-center gap-2">
            <SeriesKey color={SERIES.total.color} />
            {SERIES.total.label}
            <span className="ml-auto tabular-nums">{money(latest.total ?? 0, currency)}</span>
          </li>
        )}
        <li className="flex items-center gap-2">
          <SeriesKey color={SERIES.regular.color} />
          {SERIES.regular.label}
          <span className="ml-auto tabular-nums">{money(latest.regular ?? 0, currency)}</span>
        </li>
        <li className="flex items-center gap-2">
          <SeriesKey color={SERIES.ideal.color} dashed />
          {SERIES.ideal.label} by day {throughDay}
          <span className="ml-auto tabular-nums">{money(latest.ideal, currency)}</span>
        </li>
      </ul>

      <div className="h-56" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
            <XAxis
              dataKey="day"
              ticks={[1, 8, 15, 22, lastDay]}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              width={52}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: number) => compactMoney(v, currency)}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <PaceTooltip active={active} payload={payload} label={label} currency={currency} hasOneOffs={hasOneOffs} />
              )}
            />
            <Line
              dataKey="ideal"
              stroke={SERIES.ideal.color}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="regular"
              stroke={SERIES.regular.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={endDot(SERIES.regular.color)}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            {hasOneOffs && (
              <Line
                dataKey="total"
                stroke={SERIES.total.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={endDot(SERIES.total.color)}
                activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Show as table</summary>
        <table className="mt-2 w-full text-right tabular-nums">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="text-left font-normal">Day</th>
              <th scope="col" className="font-normal">Regular</th>
              {hasOneOffs && <th scope="col" className="font-normal">Incl. one-offs</th>}
              <th scope="col" className="font-normal">Even pace</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, throughDay).map((r) => (
              <tr key={r.day}>
                <th scope="row" className="text-left font-normal">{r.day}</th>
                <td>{money(r.regular ?? 0, currency)}</td>
                {hasOneOffs && <td>{money(r.total ?? 0, currency)}</td>}
                <td>{money(r.ideal, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
