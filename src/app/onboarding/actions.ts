"use server";

import { redirect } from "next/navigation";
import { monthStart, todayInTimeZone } from "@/lib/dates";
import { parseCents } from "@/lib/money";
import { requireUser } from "@/lib/queries";
import { onboardingInput } from "@/lib/schemas";

export type OnboardingState = { error: string | null };

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const amountCents = parseCents(String(formData.get("budget") ?? ""));
  if (amountCents === null) return { error: "Enter your budget as a number, like 2000 or 2000.00." };

  const parsed = onboardingInput.safeParse({
    currency: formData.get("currency"),
    timezone: formData.get("timezone"),
    amountCents,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { currency, timezone } = parsed.data;

  const { supabase, user } = await requireUser();
  // Upserts make a retried or half-finished onboarding safe to submit again.
  const profile = await supabase.from("profiles").upsert({ id: user.id, currency, timezone });
  if (profile.error) return { error: "Couldn't save your settings. Try again." };

  const budget = await supabase.from("budgets").upsert(
    { effective_month: monthStart(todayInTimeZone(timezone)), amount_cents: parsed.data.amountCents },
    { onConflict: "user_id,effective_month" },
  );
  if (budget.error) return { error: "Couldn't save your budget. Try again." };

  redirect("/");
}
