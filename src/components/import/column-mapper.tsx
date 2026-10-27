"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DATE_FORMATS, parseCsvDate } from "@/lib/csv/dates";
import type { AmountMapping, ColumnMapping } from "@/lib/csv/detect";
import { dayLabel } from "@/lib/format";

function ColumnSelect({
  label,
  value,
  headers,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a column…</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function ColumnMapper({
  headers,
  sampleRows,
  mapping,
  onChange,
}: {
  headers: string[];
  sampleRows: Record<string, string>[];
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}) {
  const id = useId();
  const { amount } = mapping;
  const setAmount = (next: AmountMapping) => onChange({ ...mapping, amount: next });
  const sampleDate = mapping.date ? sampleRows.find((r) => r[mapping.date])?.[mapping.date] : undefined;
  const parsedSample = sampleDate ? parseCsvDate(sampleDate, mapping.dateFormat) : null;

  return (
    <div className="flex flex-col gap-4">
      <ColumnSelect label="Date column" value={mapping.date} headers={headers} onChange={(date) => onChange({ ...mapping, date })} />

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-format`}>Date format</Label>
        <Select
          id={`${id}-format`}
          value={mapping.dateFormat}
          onChange={(e) => onChange({ ...mapping, dateFormat: e.target.value as ColumnMapping["dateFormat"] })}
          aria-describedby={`${id}-format-sample`}
        >
          {DATE_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        {sampleDate && (
          <p id={`${id}-format-sample`} className={parsedSample ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
            “{sampleDate}” → {parsedSample ? dayLabel(parsedSample) : "doesn't match this format"}
          </p>
        )}
      </div>

      <ColumnSelect
        label="Description column"
        value={mapping.description}
        headers={headers}
        onChange={(description) => onChange({ ...mapping, description })}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Amounts</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`${id}-amount-kind`}
            className="size-4 accent-primary"
            checked={amount.kind === "single"}
            onChange={() => setAmount({ kind: "single", column: "", negativeIsSpending: true })}
          />
          One amount column
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`${id}-amount-kind`}
            className="size-4 accent-primary"
            checked={amount.kind === "split"}
            onChange={() => setAmount({ kind: "split", debit: "", credit: "" })}
          />
          Separate money out / money in columns
        </label>

        {amount.kind === "single" ? (
          <>
            <ColumnSelect
              label="Amount column"
              value={amount.column}
              headers={headers}
              onChange={(column) => setAmount({ ...amount, column })}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={amount.negativeIsSpending}
                onChange={(e) => setAmount({ ...amount, negativeIsSpending: e.target.checked })}
              />
              Spending is shown as negative numbers
            </label>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ColumnSelect
              label="Money out"
              value={amount.debit}
              headers={headers}
              onChange={(debit) => setAmount({ ...amount, debit })}
            />
            <ColumnSelect
              label="Money in"
              value={amount.credit}
              headers={headers}
              onChange={(credit) => setAmount({ ...amount, credit })}
            />
          </div>
        )}
      </fieldset>
    </div>
  );
}
