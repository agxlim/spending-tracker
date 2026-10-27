import { Button } from "@/components/ui/button";
import { signOut } from "./settings/actions";

// Placeholder until the dashboard (step 6).
export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Spending Tracker</h1>
      <p className="text-muted-foreground">You&apos;re signed in. The dashboard is coming next.</p>
      <form action={signOut}>
        <Button variant="outline" type="submit">
          Sign out
        </Button>
      </form>
    </main>
  );
}
