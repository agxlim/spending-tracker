"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { merchantKey } from "@/lib/merchant";
import { requireUser } from "@/lib/queries";
import { transactionInput } from "@/lib/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

const transactionId = z.uuid();

/** Creates a transaction (id null) or updates one, and remembers the merchant's category. */
export async function saveTransaction(id: string | null, input: unknown): Promise<ActionResult> {
  const parsedId = id === null ? null : transactionId.safeParse(id);
  const parsed = transactionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsedId && !parsedId.success) return { ok: false, error: "Unknown transaction" };

  const { occurredOn, amountCents, description, category, isOneOff } = parsed.data;
  const key = merchantKey(description);
  const fields = {
    occurred_on: occurredOn,
    amount_cents: amountCents,
    description,
    merchant_key: key || null,
    category,
    is_one_off: isOneOff,
  };

  const { supabase } = await requireUser();
  const { error } = parsedId
    ? await supabase.from("transactions").update(fields).eq("id", parsedId.data)
    : await supabase.from("transactions").insert({ ...fields, source: "manual" });
  if (error) return { ok: false, error: "Couldn't save. Try again." };

  if (key) {
    // Best effort: a failure here only loses the category suggestion.
    await supabase
      .from("merchant_categories")
      .upsert({ merchant_key: key, category }, { onConflict: "user_id,merchant_key" });
  }

  refresh();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const parsedId = transactionId.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Unknown transaction" };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").delete().eq("id", parsedId.data);
  if (error) return { ok: false, error: "Couldn't delete. Try again." };

  refresh();
  return { ok: true };
}
