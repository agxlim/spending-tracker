# CLAUDE.md

A personal-project web app that keeps one individual's monthly spending under a single total budget. `PRD.md` has the full spec, scope and roadmap.

## Stack
Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, Recharts, Supabase (Postgres + Auth), Zod, Vitest + Playwright. Deployed on Vercel. Stay within the free tiers.

## Rules that always hold
- **Money is integer cents** (`bigint` / `number` of cents). Never use floats for amounts.
- **Positive amounts are spending; negative amounts are refunds.**
- **Transaction dates are local calendar dates** in the user's timezone (`profiles.timezone`). Compute "today" in that timezone, not in UTC or the server's timezone.
- **Every table has RLS with `user_id = auth.uid()`.** Data access goes through the user's Supabase session. The service-role key never reaches the client.
- **Budget math is pure TypeScript computed on read** from transactions. Don't store derived values like safe-to-spend or streaks. Every change to this logic needs unit tests.
- **Zod validates** every form and server action input.
- **Raw CSV files are never stored.** They are parsed in the browser.

## Domain rules
- There is one total budget per calendar month. Unspent money never rolls over. A month's budget is the `budgets` row with the latest `effective_month` ≤ that month.
- Safe to spend today = `max(0, floor((budget − all one-offs this month − regular spending before today) ÷ days left including today))`. It is recalculated daily.
- One-offs (`is_one_off`) count against the budget but are ignored when judging whether a day is under or over pace.
- Each budget row has an optional savings goal (`savings_rate_bps`, basis points, 0–9000). Pace and streaks are judged against the **streak budget** = `floor(budget × (10000 − savings_rate_bps) ÷ 10000)`; safe to spend still uses the full budget.
- A day is under pace when its regular spending ≤ that day's streak target (the safe-to-spend formula run on the streak budget; equal to safe to spend when there's no savings goal). Streaks are runs of under-pace days and continue across months. Today doesn't count until it ends.
- Categories come from a fixed list and are only used for insights. They never have their own limits.

## Never add
Per-category budgets, envelopes, shared or household budgets, or investment, net-worth or debt tracking. These are product non-goals, not deferred features.
