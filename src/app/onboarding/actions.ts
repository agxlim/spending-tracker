"use server";

import { redirect } from "next/navigation";
import { monthStart, todayInTimeZone } from "@/lib/dates";
import { parseCents, parseOptionalCents, parsePercentBps } from "@/lib/money";
import { requireUser } from "@/lib/queries";
import { onboardingInput } from "@/lib/schemas";

export type OnboardingState = { error: string | null };

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const amountCents = parseCents(String(formData.get("budget") ?? ""));
  if (amountCents === null) return { error: "Enter your budget as a number, like 2000 or 2000.00." };
  // The savings goal is optional; blank means 0%.
  const rateInput = String(formData.get("savingsRate") ?? "").trim();
  const savingsRateBps = rateInput === "" ? 0 : parsePercentBps(rateInput);
  if (savingsRateBps === null) return { error: "Enter your savings goal as a percentage, like 10." };
  const incomeCents = parseOptionalCents(String(formData.get("income") ?? ""));
  if (incomeCents === undefined) return { error: "Enter your income as a number, like 4000 or 4000.00." };

  const parsed = onboardingInput.safeParse({
    currency: formData.get("currency"),
    timezone: formData.get("timezone"),
    amountCents,
    savingsRateBps,
    incomeCents,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { currency, timezone } = parsed.data;

  const { supabase, user } = await requireUser();
  // Upserts make a retried or half-finished onboarding safe to submit again.
  const profile = await supabase.from("profiles").upsert({ id: user.id, currency, timezone });
  if (profile.error) return { error: "Couldn't save your settings. Try again." };

  const budget = await supabase.from("budgets").upsert(
    {
      effective_month: monthStart(todayInTimeZone(timezone)),
      amount_cents: parsed.data.amountCents,
      savings_rate_bps: parsed.data.savingsRateBps,
      income_cents: parsed.data.incomeCents,
    },
    { onConflict: "user_id,effective_month" },
  );
  if (budget.error) return { error: "Couldn't save your budget. Try again." };

  redirect("/");
}
