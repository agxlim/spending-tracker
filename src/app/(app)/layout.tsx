import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BottomNav } from "@/components/nav/bottom-nav";
import { getProfile, hasBudget } from "@/lib/queries";

/** Sends users who haven't finished onboarding to /onboarding. */
async function RequireOnboarded({ children }: { children: React.ReactNode }) {
  if (!(await getProfile()) || !(await hasBudget())) redirect("/onboarding");
  return children;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading…</p>}>
          <RequireOnboarded>{children}</RequireOnboarded>
        </Suspense>
      </div>
      <BottomNav />
    </>
  );
}
