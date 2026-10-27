import type { Metadata } from "next";
import { Suspense } from "react";
import { ImportHistory } from "@/components/import/import-history";
import { ImportWizard } from "@/components/import/import-wizard";
import { getImports, getMerchantCategories, requireProfile } from "@/lib/queries";

export const metadata: Metadata = { title: "Import · Spending Tracker" };

async function ImportContent() {
  const { profile } = await requireProfile();
  const [remembered, imports] = await Promise.all([getMerchantCategories(), getImports()]);
  return (
    <>
      <section aria-labelledby="import-heading" className="flex flex-col gap-3">
        <h1 id="import-heading" className="text-lg font-semibold">
          Import a bank CSV
        </h1>
        <ImportWizard savedMapping={profile.csv_mapping} remembered={remembered} currency={profile.currency} />
      </section>
      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h2 id="history-heading" className="text-sm font-medium">
          Recent imports
        </h2>
        <ImportHistory imports={imports} />
      </section>
    </>
  );
}

export default function ImportPage() {
  return (
    <main className="flex flex-1 flex-col gap-8 p-4">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ImportContent />
      </Suspense>
    </main>
  );
}
