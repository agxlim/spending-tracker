import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { BudgetForm, DeleteAccountForm, ProfileForm } from "@/components/settings/settings-forms";
import { Button } from "@/components/ui/button";
import { budgetRowForMonth } from "@/lib/budget";
import { bpsToPercentString, centsToDecimalString } from "@/lib/money";
import { getBudgets, requireProfile, requireUser } from "@/lib/queries";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Settings · Spending Tracker" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 id={id} className="text-sm font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

async function SettingsContent() {
  const [{ profile, today }, { user }, budgets] = await Promise.all([requireProfile(), requireUser(), getBudgets()]);
  const budget = budgetRowForMonth(budgets, today);
  return (
    <>
      <Section title="Budget">
        <BudgetForm
          amount={budget === null ? "" : centsToDecimalString(budget.amountCents)}
          savingsRate={budget?.savingsRateBps ? bpsToPercentString(budget.savingsRateBps) : ""}
          income={budget?.incomeCents ? centsToDecimalString(budget.incomeCents) : ""}
        />
      </Section>
      <Section title="Currency and timezone">
        <ProfileForm currency={profile.currency} timezone={profile.timezone} />
      </Section>
      <Section title="Account">
        <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </Section>
      <Section title="Delete account">
        <DeleteAccountForm />
      </Section>
    </>
  );
}

export default function SettingsPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Settings</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <SettingsContent />
      </Suspense>
    </main>
  );
}
