"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { findExistingTransactions, importCsv } from "@/app/(app)/import/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category } from "@/lib/categories";
import type { ColumnMapping } from "@/lib/csv/detect";
import { CsvLimitError, mapRows, MAX_CSV_BYTES, parseCsvText, type ParsedCsv } from "@/lib/csv/parse";
import { buildPreview, dateRange, isMappingComplete, resolveMapping, rowsToImport, type Preview } from "@/lib/csv/preview";
import { ColumnMapper } from "./column-mapper";
import { ImportPreview } from "./import-preview";

type Step =
  | { name: "upload" }
  | { name: "map"; filename: string; csv: ParsedCsv; mapping: ColumnMapping }
  | { name: "preview"; filename: string; csv: ParsedCsv; mapping: ColumnMapping; preview: Preview }
  | { name: "done"; imported: number; skipped: number };

export function ImportWizard({
  savedMapping,
  remembered,
  currency,
}: {
  savedMapping: unknown;
  remembered: Record<string, Category>;
  currency: string;
}) {
  const id = useId();
  const [step, setStep] = useState<Step>({ name: "upload" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function readFile(file: File) {
    setError(null);
    if (file.size > MAX_CSV_BYTES) return setError("That file is larger than 2 MB.");
    try {
      // Parsed here in the browser; the file itself is never uploaded.
      const csv = parseCsvText(await file.text());
      if (csv.headers.length === 0 || csv.rows.length === 0) return setError("No rows found in that file.");
      setStep({ name: "map", filename: file.name, csv, mapping: resolveMapping(savedMapping, csv.headers, csv.rows) });
    } catch (e) {
      setError(e instanceof CsvLimitError ? e.message : "Couldn't read that file. Is it a CSV?");
    }
  }

  function showPreview() {
    if (step.name !== "map") return;
    const mapped = mapRows(step.csv.rows, step.mapping);
    const range = dateRange(mapped);
    startTransition(async () => {
      try {
        const existing = range ? await findExistingTransactions(range) : [];
        setStep({ ...step, name: "preview", preview: buildPreview(mapped, existing, remembered) });
      } catch {
        setError("Couldn't check for duplicates. Try again.");
      }
    });
  }

  function runImport() {
    if (step.name !== "preview") return;
    setError(null);
    startTransition(async () => {
      const result = await importCsv({
        filename: step.filename.slice(0, 255),
        rowCount: step.csv.rows.length,
        mapping: step.mapping,
        rows: rowsToImport(step.preview.rows),
      });
      if (result.ok) setStep({ name: "done", imported: result.imported, skipped: result.skipped });
      else setError(result.error);
    });
  }

  const errorMessage = error && (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  );

  if (step.name === "upload") {
    return (
      <div className="flex flex-col gap-3">
        <Label htmlFor={`${id}-file`}>Bank CSV file</Label>
        <Input
          id={`${id}-file`}
          type="file"
          accept=".csv,text/csv"
          className="h-auto py-2"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            e.target.value = "";
          }}
          aria-describedby={`${id}-file-help`}
        />
        <p id={`${id}-file-help`} className="text-xs text-muted-foreground">
          Up to 5,000 rows and 2 MB. The file is read on this device and never uploaded.
        </p>
        {errorMessage}
      </div>
    );
  }

  if (step.name === "map") {
    const complete = isMappingComplete(step.mapping, step.csv.headers);
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {step.filename} · {step.csv.rows.length} rows. Check which column is which.
        </p>
        <ColumnMapper
          headers={step.csv.headers}
          sampleRows={step.csv.rows.slice(0, 20)}
          mapping={step.mapping}
          onChange={(mapping) => setStep({ ...step, mapping })}
        />
        {errorMessage}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep({ name: "upload" })}>
            Back
          </Button>
          <Button className="flex-1" disabled={!complete || pending} onClick={showPreview}>
            {pending ? "Checking…" : "Preview"}
          </Button>
        </div>
      </div>
    );
  }

  if (step.name === "preview") {
    const { rows, errors } = step.preview;
    const toImport = rowsToImport(rows).length;
    const duplicates = rows.filter((r) => r.duplicate).length;
    const unticked = rows.filter((r) => !r.duplicate && !r.include).length;
    return (
      <div className="flex flex-col gap-4">
        <ul className="grid grid-cols-2 gap-2 text-sm">
          <li className="rounded-lg bg-muted p-3">
            <span className="block text-lg font-semibold tabular-nums">{toImport}</span> to import
          </li>
          <li className="rounded-lg bg-muted p-3">
            <span className="block text-lg font-semibold tabular-nums">{duplicates}</span> duplicates
          </li>
          <li className="rounded-lg bg-muted p-3">
            <span className="block text-lg font-semibold tabular-nums">{unticked}</span> unticked
          </li>
          <li className="rounded-lg bg-muted p-3">
            <span className="block text-lg font-semibold tabular-nums">{errors.length}</span> couldn&apos;t be read
          </li>
        </ul>
        {errors.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Rows that couldn&apos;t be read</summary>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {errors.slice(0, 50).map((e) => (
                <li key={e.index}>
                  Row {e.index + 1}: {e.error}
                </li>
              ))}
            </ul>
          </details>
        )}
        <ImportPreview
          rows={rows}
          currency={currency}
          onChange={(next) => setStep({ ...step, preview: { ...step.preview, rows: next } })}
        />
        {errorMessage}
        <div className="sticky bottom-14 flex gap-2 bg-background py-2">
          <Button variant="outline" onClick={() => setStep({ ...step, name: "map" })} disabled={pending}>
            Back
          </Button>
          <Button className="flex-1" disabled={toImport === 0 || pending} onClick={runImport}>
            {pending ? "Importing…" : `Import ${toImport} ${toImport === 1 ? "transaction" : "transactions"}`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-col gap-3">
      <p>
        Imported <strong>{step.imported}</strong> {step.imported === 1 ? "transaction" : "transactions"}
        {step.skipped > 0 && `, skipped ${step.skipped}`}.
      </p>
      <div className="flex gap-2">
        <Link href="/transactions" className="text-sm underline underline-offset-4">
          See transactions
        </Link>
        <button type="button" className="text-sm underline underline-offset-4" onClick={() => setStep({ name: "upload" })}>
          Import another file
        </button>
      </div>
    </div>
  );
}
