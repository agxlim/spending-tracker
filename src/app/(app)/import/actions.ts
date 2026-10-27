"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { Category } from "@/lib/categories";
import type { DedupeFields } from "@/lib/csv/dedupe";
import { isValidISODate } from "@/lib/dates";
import { merchantKey } from "@/lib/merchant";
import { getTransactions, requireUser } from "@/lib/queries";
import { importInput } from "@/lib/schemas";

export type ImportResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string };

const dateRangeInput = z.object({
  from: z.string().refine(isValidISODate),
  to: z.string().refine(isValidISODate),
});

/** Existing transactions in the file's date range, for flagging duplicates in the preview. */
export async function findExistingTransactions(range: unknown): Promise<DedupeFields[]> {
  const { from, to } = dateRangeInput.parse(range);
  const txns = await getTransactions(from, to);
  return txns.map(({ occurredOn, amountCents, description }) => ({ occurredOn, amountCents, description }));
}

export async function importCsv(input: unknown): Promise<ImportResult> {
  const parsed = importInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { filename, rowCount, mapping, rows } = parsed.data;
  if (rows.length > rowCount) return { ok: false, error: "More rows than the file has" };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.rpc("import_transactions", {
    p_filename: filename,
    p_row_count: rowCount,
    p_rows: rows.map((r) => ({
      occurred_on: r.occurredOn,
      amount_cents: r.amountCents,
      description: r.description,
      merchant_key: merchantKey(r.description) || null,
      category: r.category,
      is_one_off: r.isOneOff,
    })),
  });
  if (error || !data) return { ok: false, error: "Import failed. Nothing was imported." };

  // Best effort: remember the mapping and any categories chosen in the preview.
  await supabase.from("profiles").update({ csv_mapping: mapping }).eq("id", user.id);
  const categories = new Map<string, Category>();
  for (const r of rows) {
    const key = merchantKey(r.description);
    if (key && r.category !== "Other") categories.set(key, r.category);
  }
  if (categories.size > 0) {
    await supabase.from("merchant_categories").upsert(
      [...categories].map(([merchant_key, category]) => ({ merchant_key, category })),
      { onConflict: "user_id,merchant_key" },
    );
  }

  refresh();
  return { ok: true, imported: data.imported_count, skipped: data.skipped_count };
}

/** Deletes an import and, by cascade, every transaction it created. */
export async function undoImport(id: string): Promise<{ ok: boolean }> {
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("imports").delete().eq("id", parsedId.data);
  refresh();
  return { ok: !error };
}
