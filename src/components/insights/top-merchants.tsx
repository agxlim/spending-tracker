import { money } from "@/lib/format";
import type { MerchantTotal } from "@/lib/insights";

export function TopMerchants({ merchants, currency }: { merchants: MerchantTotal[]; currency: string }) {
  if (merchants.length === 0) return <p className="text-sm text-muted-foreground">No spending yet.</p>;
  return (
    <ol className="divide-y">
      {merchants.map((m, i) => (
        <li key={m.merchantKey} className="flex items-center gap-3 py-2 text-sm">
          <span className="w-4 text-muted-foreground tabular-nums">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate">{m.label}</span>
          <span className="text-muted-foreground">
            {m.count} {m.count === 1 ? "visit" : "visits"}
          </span>
          <span className="w-24 text-right tabular-nums">{money(m.totalCents, currency)}</span>
        </li>
      ))}
    </ol>
  );
}
