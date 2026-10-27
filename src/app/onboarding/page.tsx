import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile, hasBudget } from "@/lib/queries";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up · Spending Tracker" };

async function AlreadyOnboardedRedirect() {
  if ((await getProfile()) && (await hasBudget())) redirect("/");
  return <OnboardingForm />;
}

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set your monthly budget</CardTitle>
          <CardDescription>We&apos;ll turn it into a number you can safely spend each day.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <AlreadyOnboardedRedirect />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
