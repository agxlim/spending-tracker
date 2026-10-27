"use client";

import { useTransition } from "react";
import { undoImport } from "@/app/(app)/import/actions";
import { Button } from "@/components/ui/button";

export interface ImportSummary {
  id: string;
  filename: string;
  imported_count: number;
  skipped_count: number;
  created_at: string;
}

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function ImportHistory({ imports }: { imports: ImportSummary[] }) {
  const [pending, startTransition] = useTransition();

  function undo(item: ImportSummary) {
    if (!confirm(`Undo the import of ${item.filename}? This deletes the ${item.imported_count} transactions it added.`)) return;
    startTransition(async () => {
      const result = await undoImport(item.id);
      if (!result.ok) alert("Couldn't undo that import. Try again.");
    });
  }

  if (imports.length === 0) return <p className="text-sm text-muted-foreground">No imports yet.</p>;

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {imports.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.filename}</p>
            <p className="text-xs text-muted-foreground" suppressHydrationWarning>
              {dateTime.format(new Date(item.created_at))} · {item.imported_count} imported
              {item.skipped_count > 0 && `, ${item.skipped_count} skipped`}
            </p>
          </div>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => undo(item)}>
            Undo
          </Button>
        </li>
      ))}
    </ul>
  );
}
