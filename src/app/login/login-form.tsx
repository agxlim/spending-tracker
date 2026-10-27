"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });
  const linkError = useSearchParams().get("error") === "link";

  if (state.status === "sent") {
    return (
      <p role="status" className="text-sm">
        Check <strong>{state.email}</strong> for a sign-in link. You can close this tab.
      </p>
    );
  }

  const message =
    state.status === "error"
      ? state.message
      : linkError
        ? "That sign-in link is invalid or has expired. Request a new one."
        : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={message ? "login-error" : undefined}
        />
      </div>
      {message && (
        <p id="login-error" role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
