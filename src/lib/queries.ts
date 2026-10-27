import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Budget } from "./budget";
import type { Category } from "./categories";
import { todayInTimeZone, type ISODate } from "./dates";
import { createClient } from "./supabase/server";
import { fromRow, type Transaction } from "./transactions";

// Supabase caps each response at 1,000 rows (api.max_rows), so long ranges are paged.
const PAGE_SIZE = 1000;

/** The signed-in user. Redirects to /login if there isn't one. Deduped per request. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

export const getProfile = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data;
});

/** Profile of a user who has finished onboarding, plus "today" in their timezone. */
export const requireProfile = cache(async () => {
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");
  return { profile, today: todayInTimeZone(profile.timezone) };
});

export const hasBudget = cache(async () => {
  const { supabase } = await requireUser();
  const { count, error } = await supabase.from("budgets").select("id", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
});

/** Transactions dated from `from` to `to` inclusive. */
export async function getTransactions(from: ISODate, to: ISODate): Promise<Transaction[]> {
  const { supabase } = await requireUser();
  const rows: Transaction[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("occurred_on")
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data.map(fromRow));
    if (data.length < PAGE_SIZE) return rows;
  }
}

/** Remembered merchant → category choices. */
export async function getMerchantCategories(): Promise<Record<string, Category>> {
  const { supabase } = await requireUser();
  const remembered: Record<string, Category> = {};
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("merchant_categories")
      .select("merchant_key, category")
      .order("merchant_key")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of data) remembered[row.merchant_key] = row.category;
    if (data.length < PAGE_SIZE) return remembered;
  }
}

export async function getBudgets(): Promise<Budget[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("budgets").select("effective_month, amount_cents").order("effective_month");
  if (error) throw error;
  return data.map((b) => ({ effectiveMonth: b.effective_month, amountCents: Number(b.amount_cents) }));
}

export async function getImports() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("imports")
    .select("id, filename, row_count, imported_count, skipped_count, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}
