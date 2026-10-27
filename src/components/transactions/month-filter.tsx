import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { addMonths, type ISODate } from "@/lib/dates";
import { monthLabel } from "@/lib/format";
import type { TransactionFilter } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const monthParam = (month: ISODate) => `/transactions?month=${month.slice(0, 7)}`;

export function MonthNav({ month, currentMonth }: { month: ISODate; currentMonth: ISODate }) {
  const next = addMonths(month, 1);
  const linkClass = "rounded-md px-3 py-2 text-sm hover:bg-muted";
  return (
    <nav aria-label="Month" className="flex items-center justify-between">
      <Link href={monthParam(addMonths(month, -1))} className={linkClass} aria-label="Previous month">
        ←
      </Link>
      <h1 className="text-lg font-semibold">{monthLabel(month)}</h1>
      {next <= currentMonth ? (
        <Link href={monthParam(next)} className={linkClass} aria-label="Next month">
          →
        </Link>
      ) : (
        <span className={cn(linkClass, "invisible")} aria-hidden>
          →
        </span>
      )}
    </nav>
  );
}

export function FilterBar({
  filter,
  onChange,
}: {
  filter: TransactionFilter;
  onChange: (filter: TransactionFilter) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="search"
          placeholder="Search"
          aria-label="Search transactions"
          value={filter.query}
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
        />
        <Select
          aria-label="Category"
          value={filter.category}
          onChange={(e) => onChange({ ...filter, category: e.target.value as TransactionFilter["category"] })}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={filter.oneOffsOnly}
          onChange={(e) => onChange({ ...filter, oneOffsOnly: e.target.checked })}
        />
        One-offs only
      </label>
    </div>
  );
}
