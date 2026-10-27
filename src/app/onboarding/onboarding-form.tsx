"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/currencies";
import { completeOnboarding, type OnboardingState } from "./actions";

const TIME_ZONES = Intl.supportedValuesOf("timeZone");

const noopSubscribe = () => () => {};
const detectTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, {
    error: null,
  });
  // The browser's timezone; empty during server render.
  const detected = useSyncExternalStore(noopSubscribe, detectTimeZone, () => "");
  const [chosen, setChosen] = useState<string | null>(null);
  const timezone = chosen ?? detected;
  const zones = timezone && !TIME_ZONES.includes(timezone) ? [timezone, ...TIME_ZONES] : TIME_ZONES;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="budget">Monthly budget</Label>
        <Input
          id="budget"
          name="budget"
          inputMode="decimal"
          placeholder="2000"
          required
          aria-describedby="budget-help"
        />
        <p id="budget-help" className="text-sm text-muted-foreground">
          One total for everything you spend in a month. You can change it later.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="currency">Currency</Label>
        <Select id="currency" name="currency" defaultValue="USD">
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select
          id="timezone"
          name="timezone"
          value={timezone}
          onChange={(e) => setChosen(e.target.value)}
          required
          aria-describedby="timezone-help"
        >
          {!timezone && <option value="">Detecting…</option>}
          {zones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <p id="timezone-help" className="text-sm text-muted-foreground">
          Decides when your day starts and ends.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending || !timezone}>
        {pending ? "Saving…" : "Start tracking"}
      </Button>
    </form>
  );
}
