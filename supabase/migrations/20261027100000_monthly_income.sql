-- Monthly income: optional, used only to show a savings rate on the dashboard.
-- Stored on the budget row like the savings goal, so changing it applies from
-- the current month and leaves earlier months alone. Null means not set.

alter table public.budgets
  add column income_cents bigint
  check (income_cents is null or income_cents > 0);
