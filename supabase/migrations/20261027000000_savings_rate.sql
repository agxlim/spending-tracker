-- Savings goal: the share of a month's budget the user wants left over.
-- Streaks are judged against the budget minus this share; safe to spend still
-- uses the full budget. Stored in basis points (1000 = 10%) so it stays an
-- integer, and on the budget row so changing it never rewrites past months.

alter table public.budgets
  add column savings_rate_bps int not null default 0
  check (savings_rate_bps between 0 and 9000);
