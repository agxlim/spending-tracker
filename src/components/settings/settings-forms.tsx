"use client";

import { useActionState, useId } from "react";
import { deleteAccount, updateBudget, updateProfile, type FormState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/currencies";
import { cn } from "@/lib/utils";

const IDLE: FormState = { status: "idle" };
const TIME_ZONES = Intl.supportedValuesOf("timeZone");

function Message({ state }: { state: FormState }) {
  if (state.status === "idle") return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={cn("text-sm", state.status === "error" ? "text-destructive" : "text-muted-foreground")}>
      {state.message}
    </p>
  );
}

export function BudgetForm({ amount, savingsRate }: { amount: string; savingsRate: string }) {
  const id = useId();
  const [state, action, pending] = useActionState(updateBudget, IDLE);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>Monthly budget</Label>
        <Input id={id} name="budget" inputMode="decimal" defaultValue={amount} required aria-describedby={`${id}-help`} />
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          Applies to this month and every month after, until you change it.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-savings`}>Savings goal (%)</Label>
        <Input
          id={`${id}-savings`}
          name="savingsRate"
          inputMode="decimal"
          placeholder="0"
          defaultValue={savingsRate}
          aria-describedby={`${id}-savings-help`}
        />
        <p id={`${id}-savings-help`} className="text-xs text-muted-foreground">
          The share of your budget you want left over. Streaks count days you stay on pace for the rest.
        </p>
      </div>
      <Message state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save budget"}
      </Button>
    </form>
  );
}

export function ProfileForm({ currency, timezone }: { currency: string; timezone: string }) {
  const id = useId();
  const [state, action, pending] = useActionState(updateProfile, IDLE);
  const zones = TIME_ZONES.includes(timezone) ? TIME_ZONES : [timezone, ...TIME_ZONES];
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-currency`}>Currency</Label>
        <Select id={`${id}-currency`} name="currency" defaultValue={currency}>
          {(CURRENCIES as readonly string[]).includes(currency) ? null : <option value={currency}>{currency}</option>}
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">Only changes how amounts are shown; nothing is converted.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-timezone`}>Timezone</Label>
        <Select id={`${id}-timezone`} name="timezone" defaultValue={timezone}>
          {zones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <Message state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const id = useId();
  const [state, action, pending] = useActionState(deleteAccount, IDLE);
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Permanently deletes your account, budgets, transactions and imports. This can&apos;t be undone.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>Type &quot;delete&quot; to confirm</Label>
        <Input id={id} name="confirm" autoComplete="off" />
      </div>
      <Message state={state} />
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deleting…" : "Delete my account"}
      </Button>
    </form>
  );
}
