# PRD: Spending Habit Tracker

*Status: Draft v1 · Date: 2026-10-26 · Type: Personal project*

---

## Part 1: Product Brief

### Problem
People set a monthly spending number in their head and then lose track of it. By the time they check, the month is mostly gone and the budget is already blown. Budgeting apps tend to be heavy, with dozens of categories and envelopes. Many people only want to answer one question: **"Am I on track this month?"**

### Product
A web app that helps an individual keep monthly spending under **one total budget**. It turns that budget into a **daily "safe to spend" number**, rewards good days with **streaks**, and shows **simple insights** about where the money went.

### Target user
Individuals managing their own money who want a lightweight way to stay under a monthly number. It is not built for couples or households, and it is not built for detailed envelope budgeting.

### Goals
1. Users can tell in under 5 seconds whether they're on track this month.
2. Logging spending is fast enough to do every day: under 10 seconds per manual entry.
3. Building a habit feels rewarding through streaks, not guilt.

### Non-goals
- Per-category budgets, envelopes, or zero-based budgeting
- Shared or household budgets
- Investment, net-worth, or debt tracking
- Push or email alerts at budget thresholds (they were left out on purpose)

### Core concepts
| Concept | Definition |
|---|---|
| **Monthly budget** | One total amount per calendar month. Unspent money does **not** roll over. |
| **Safe to spend today** | `(budget − all one-offs this month − regular spending before today) ÷ days left in month (including today)`. Recalculated every day. Shown as $0 once the budget is used up. |
| **Savings goal** | Optional share of the monthly budget the user wants left over (0–90%, default 0%). Set at onboarding and editable in Settings from the current month onward. |
| **Monthly income** | Optional amount the user earns per month. Set at onboarding or in Settings, from the current month onward. Used only for the savings rate; it never changes the budget, safe to spend or streaks. |
| **Savings rate** | `(income − everything spent this month, one-offs included) ÷ income`, shown on the dashboard when income is set, alongside the rate the user would reach by spending the whole budget, `(income − budget) ÷ income`. Can go negative. |
| **Streak target** | The safe-to-spend formula run on the budget minus the savings goal. Equal to safe to spend when there's no savings goal. |
| **Under-pace day** | A finished day where that day's spending ≤ that day's streak target. |
| **No-spend day** | A finished day with $0 of spending. |
| **Streak** | A run of consecutive under-pace days. No-spend days are tracked as their own count and also count as under-pace. |
| **One-off** | A transaction flagged as a big planned purchase (rent, a flight). It **still counts against the monthly budget**, but it comes out of the remaining pool up front and is **ignored when judging a day under or over pace**. Paying rent doesn't break a streak, and the month's total stays honest. |

### Success metrics (personal-project scale)
- I log spending on at least 5 days a week for a month.
- I finish at least 2 of 3 months under budget.
- The dashboard loads in under 1 second on a phone browser.

---

## MVP Scope

### ✅ In the MVP
| Area | What's included |
|---|---|
| **Accounts** | Email magic-link sign-in; one user, one currency (set at signup) |
| **Budget** | Set and edit one total monthly budget, an optional savings goal (%) and an optional monthly income; all carry into new months until changed |
| **Manual entry** | Add, edit, and delete a transaction: amount, date (defaults to today), merchant/note, category, and a **"one-off" toggle**. Refunds are entered as negative amounts. |
| **CSV import** | Upload a bank CSV, map columns (date, amount, description), preview, then import. Exact duplicates (same date + amount + description) are skipped. |
| **One-offs** | Flag any transaction as a one-off (on entry, on edit, or per row in the CSV preview). The dashboard shows "includes $X of one-offs" under the progress bar. |
| **Categories** | Fixed default list (Groceries, Dining, Transport, Shopping, Bills, Entertainment, Health, Other). The app remembers merchant→category and uses it for future entries and imports. Categories are for insights only and have no limits. |
| **Dashboard** | Safe to spend today (the headline number), spent vs. budget progress bar, days left, savings rate (when income is set), current streak (with today's streak target when a savings goal is set), and a month calendar where tapping a day shows its spending against its target |
| **Streaks** | Current and best under-pace streak; the last 7 finished days, each marked underspent / overspent / no spend; counts of underspent, overspent and no-spend days this month; calendar heatmap of the month (under pace / over pace / no-spend), judged against the streak target, on the dashboard and in Insights |
| **Insights** | Spending by category this month, top 5 merchants, this month vs. last month at the same day, cumulative spend vs. ideal-pace line chart |
| **Responsive web** | Mobile-first layout that also works on desktop; installable as a PWA (home-screen icon) |

### ❌ Out of the MVP (later)
| Feature | Why it's deferred |
|---|---|
| **Bank sync (Plaid etc.)** | Per-connection fees, aggregator approval, and security burden don't fit a personal project. CSV import covers most of the need. **Phase 3, if ever.** |
| **Receipt photo scanning (OCR)** | Needs an OCR or LLM service and handling for messy results. **Phase 2.** |
| **Budget alerts / notifications** | Not requested. Safe-to-spend covers the same need passively. |
| Rollover of unspent budget | Explicitly not wanted for v1 |
| Per-category budgets | Out of product scope |
| Custom categories | The fixed list is enough to start. **Phase 2.** |
| Multi-currency | Single currency per user |
| Native iOS/Android apps | The PWA covers mobile use |
| Recurring transactions / subscriptions detection | **Phase 2** |
| Data export | **Phase 2** (CSV export is easy to add) |

### Roadmap sketch
- **Phase 1 (MVP):** everything in the "in" table
- **Phase 2:** receipt scanning, custom categories, recurring transactions, CSV export
- **Phase 3:** bank sync, optional alerts

---

## Part 2: Technical Spec

### Stack
The stack was chosen to be simple, cheap (free tier), and need little ops work.

| Layer | Choice | Reason |
|---|---|---|
| Frontend + server | **Next.js (App Router) + TypeScript** | One codebase for UI and server logic; easy to deploy |
| UI | **Tailwind CSS + shadcn/ui** | Fast to build, looks clean on mobile |
| Charts | **Recharts** | Simple React charts for insights |
| Database + auth | **Supabase** (Postgres + Auth) | Free tier, magic-link auth, Row-Level Security |
| CSV parsing | **Papa Parse** (client-side) | Parses in the browser, so the raw file is never stored |
| Hosting | **Vercel** (free tier) | Zero-config Next.js hosting |
| Validation | **Zod** | Shared schemas for forms and server actions |
| Testing | **Vitest** (unit) + **Playwright** (e2e smoke) | Covers budget math and key flows |

### Architecture
```
Browser (Next.js React, PWA)
   │  Server Actions / Route Handlers
   ▼
Next.js on Vercel ──► Supabase Postgres (RLS: user_id = auth.uid())
                  └─► Supabase Auth (magic link)
```
- All reads and writes go through Server Actions using the user's Supabase session. RLS enforces per-user isolation.
- Budget math (safe to spend, streaks) is computed **on read** from transactions as pure TypeScript functions. Nothing is precomputed, so edits are always reflected right away. At a single user's data volume this is cheap.

### Data model
```sql
profiles (
  id            uuid PK  -- = auth.users.id
  currency      text      not null default 'USD'
  timezone      text      not null            -- IANA, e.g. 'America/New_York'
  created_at    timestamptz default now()
)

budgets (
  id            uuid PK
  user_id       uuid FK → profiles.id
  effective_month date not null               -- first day of month this amount starts applying
  amount_cents  bigint not null check (amount_cents > 0)
  savings_rate_bps int not null default 0 check (savings_rate_bps between 0 and 9000)  -- 1000 = 10%
  income_cents  bigint null check (income_cents is null or income_cents > 0)   -- optional, for the savings rate only
  unique (user_id, effective_month)
)
-- Budget for month M = row with greatest effective_month <= M.
-- Streak budget for month M = floor(amount_cents × (10000 − savings_rate_bps) ÷ 10000).

transactions (
  id            uuid PK
  user_id       uuid FK → profiles.id
  occurred_on   date not null                  -- local date in user's timezone
  amount_cents  bigint not null                -- positive = spend, negative = refund
  description   text not null default ''
  merchant_key  text                           -- normalized description for categorization
  category      text not null default 'Other'  -- one of the fixed list
  is_one_off    boolean not null default false -- excluded from daily pace/streaks, still counts toward budget
  source        text not null check (source in ('manual','csv'))
  import_id     uuid null FK → imports.id
  created_at    timestamptz default now()
)
index on (user_id, occurred_on)

imports (
  id            uuid PK
  user_id       uuid FK
  filename      text
  row_count     int
  imported_count int
  skipped_count int
  created_at    timestamptz default now()
)

merchant_categories (
  user_id       uuid FK
  merchant_key  text
  category      text
  primary key (user_id, merchant_key)
)
```
- Money is stored as **integer cents** and never as floats.
- Dates are stored as **local calendar dates** in the user's timezone, so "today" and day boundaries match what the user sees.
- RLS on every table: `user_id = auth.uid()`.

### Core logic (pure functions, unit-tested)
```ts
budgetForMonth(budgets, month): cents
spentInRange(txns, from, to): cents             // sum of amounts, refunds reduce it
paceBudgetForMonth(budgets, month): cents       // budget minus the savings goal
safeToSpendToday(budget, txns, today): cents
  // remaining = budget − oneOffs(whole month, any date) − regularSpent(monthStart .. today−1)
  // daysLeft  = daysInMonth − day(today) + 1
  // max(0, floor(remaining / daysLeft))
dailyStatus(paceBudget, txns, month): Array<{date, spent, allowance, status: 'under'|'over'|'nospend'|'future'}>
  // allowance for day d = streak target: safe-to-spend on the streak budget as of day d
  // spent for day d = regular (non-one-off) transactions only
savingsRateBps(income, spent): bps            // trunc((income − spent) × 10000 ÷ income); negative when over income
streaks(dailyStatuses across months): { current, best, underThisMonth, overThisMonth, noSpendThisMonth }
  // today is excluded until it ends; streaks continue across month boundaries
```
**Edge cases:**
- Refunds can make a day's net spend negative. That counts as under-pace, but **not** as no-spend unless there were no transactions at all.
- Editing a past transaction recomputes past days and can break or restore a streak. This is intended.
- Days before the user signed up are excluded from streaks.
- One-offs dated later in the month (for example, rent logged in advance) reduce today's safe-to-spend straight away. That is intended, so the money is reserved.
- A day whose only transactions are one-offs counts as a no-spend day.
- Flagging or unflagging a past transaction as a one-off recomputes history, like any other edit.
- Insights include one-offs in totals and category breakdowns, but the pace chart plots regular spending plus a separate one-off step.
- When the budget is exhausted, safe to spend is $0, and any further spending makes the day "over".

### CSV import flow
1. The user picks a file, which Papa Parse reads in the browser.
2. A column-mapping step, with columns pre-filled from the header names: date column, amount column (or separate debit/credit columns), description column, date format, and "amounts are negative for spending" toggle. The mapping is saved per user for next time.
3. A preview table shows the parsed rows, flags likely duplicates and unparseable rows, and shows the auto-assigned category (from `merchant_categories`, else "Other").
4. On confirm, a Server Action validates with Zod and bulk-inserts in one transaction. It creates the `imports` row, and the import can be undone by deleting by `import_id`.
5. Limits: 5,000 rows and 2 MB per file.

`merchant_key` = lowercase description with digits, punctuation, and common prefixes ("POS", "DEBIT", "SQ *") removed, then trimmed.

### Pages
| Route | Content |
|---|---|
| `/login` | Magic-link sign-in |
| `/onboarding` | Currency, timezone (auto-detected), first monthly budget, optional savings goal, optional monthly income |
| `/` | Dashboard: safe to spend today, progress bar, savings rate, streak with the last 7 days, month calendar with day detail, quick-add button |
| `/transactions` | Month list with filters; add/edit/delete |
| `/import` | CSV upload → map → preview → confirm; import history with undo |
| `/insights` | Category breakdown, top merchants, vs. last month, pace chart, calendar heatmap |
| `/settings` | Budget amount, savings goal and monthly income, currency, timezone, sign out, delete account |

### Non-functional requirements
- **Performance:** dashboard TTFB < 500 ms, and quick-add saves in < 300 ms (with an optimistic UI).
- **Security:** RLS on all tables; no service-role key in the client; raw CSVs never stored.
- **Privacy:** account deletion removes all user rows (cascading FKs).
- **Accessibility:** WCAG AA contrast; charts have text equivalents (totals listed beside them).
- **Cost:** $0/month on the Vercel and Supabase free tiers.

### Testing
- Unit tests for all budget, streak and date functions, including month boundaries, leap years, timezone edges, refunds and budget changes mid-history.
- Unit tests for CSV parsing and column auto-detection, using a variety of sample CSV layouts (single signed amount column, separate debit/credit columns, different date formats).
- Playwright smoke test: sign up → set budget → add a transaction → see safe-to-spend change.

### Decisions
- The allowance is **recalculated daily** (decided 2026-10-26).
- Big one-off purchases **can be excluded from pace** with the `is_one_off` flag, and they still count toward the budget (decided 2026-10-26).
- **Savings goal for streaks** (decided 2026-10-27). Users can set a savings goal as a share of the budget, from onboarding on. Streaks and the calendar judge days against the budget minus that share. The headline safe-to-spend stays on the full budget, and the dashboard shows a separate "streak target today". The goal is stored on the budget row, so changing it applies from the current month and leaves earlier months' streaks alone.
- **Month calendar on the dashboard** (decided 2026-10-27). The dashboard shows the current month's calendar. Tapping a day shows that day's spending against its streak target. Insights keeps its own calendar for browsing past months.
- **Monthly income and savings rate** (decided 2026-10-27). Users can enter an optional monthly income, stored on the budget row so it is versioned by month like the savings goal. The dashboard shows the savings rate so far this month (everything spent, one-offs included) and the rate if the whole budget is spent. Income doesn't affect safe to spend or streaks. Income tracking stays a single number; it is not transaction-level income or net-worth tracking.
- **Day-by-day streak breakdown** (decided 2026-10-27). The streak card lists the last 7 finished days marked underspent, overspent or no spend, and counts each kind for this month.
- **No bank-specific CSV presets.** Import uses one generic column mapper. It guesses columns from common header names (date, amount, debit, credit, description, payee, memo) and the user confirms. The confirmed mapping is saved per user and reused next time. Presets for specific banks could be added later if needed (decided 2026-10-26).
