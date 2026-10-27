"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { monthStart, todayInTimeZone } from "@/lib/dates";
import { parseCents, parseOptionalCents, parsePercentBps } from "@/lib/money";
import { requireProfile, requireUser } from "@/lib/queries";
import { budgetInput, profileInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export type FormState = { status: "idle" | "saved" | "error"; message?: string };

/** Sets the budget, savings goal and income from this month onward; earlier months keep theirs. */
export async function updateBudget(_prev: FormState, formData: FormData): Promise<FormState> {
  const amountCents = parseCents(String(formData.get("budget") ?? ""));
  // Blank means no savings goal.
  const rateInput = String(formData.get("savingsRate") ?? "").trim();
  const savingsRateBps = rateInput === "" ? 0 : parsePercentBps(rateInput);
  if (savingsRateBps === null) return { status: "error", message: "Enter your savings goal as a percentage, like 10." };
  const incomeCents = parseOptionalCents(String(formData.get("income") ?? ""));
  if (incomeCents === undefined) return { status: "error", message: "Enter your income as a number, like 4000 or 4000.00." };
  const parsed = budgetInput.safeParse({ amountCents, savingsRateBps, incomeCents });
  if (amountCents === null || !parsed.success) {
    return { status: "error", message: parsed.error?.issues[0].message ?? "Enter an amount like 2000 or 2000.00." };
  }

  const { today } = await requireProfile();
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("budgets")
    .upsert(
      {
        effective_month: monthStart(today),
        amount_cents: parsed.data.amountCents,
        savings_rate_bps: parsed.data.savingsRateBps,
        income_cents: parsed.data.incomeCents,
      },
      { onConflict: "user_id,effective_month" },
    );
  if (error) return { status: "error", message: "Couldn't save your budget. Try again." };

  refresh();
  return { status: "saved", message: "Budget saved." };
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileInput.safeParse({ currency: formData.get("currency"), timezone: formData.get("timezone") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { status: "error", message: "Couldn't save. Try again." };

  refresh();
  return { status: "saved", message: `Saved. Today is ${todayInTimeZone(parsed.data.timezone)} in ${parsed.data.timezone}.` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Permanently deletes the account; every row cascades from the auth user. */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== "delete") {
    return { status: "error", message: 'Type "delete" to confirm.' };
  }
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { status: "error", message: "Couldn't delete your account. Try again." };

  // The auth user is gone; clear the now-invalid session cookies.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
