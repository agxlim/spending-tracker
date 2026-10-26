-- Initial schema for the spending tracker.
-- Money is integer cents; dates are local calendar dates in the user's timezone.
-- Every table has RLS restricted to the owning user.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  currency    text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  timezone    text not null,
  -- Last confirmed CSV column mapping, reused on the next import.
  csv_mapping jsonb,
  created_at  timestamptz not null default now()
);

create table public.budgets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  effective_month date not null check (extract(day from effective_month) = 1),
  amount_cents    bigint not null check (amount_cents > 0),
  unique (user_id, effective_month)
);

create table public.imports (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  filename       text not null,
  row_count      int not null check (row_count >= 0),
  imported_count int not null check (imported_count >= 0),
  skipped_count  int not null check (skipped_count >= 0),
  created_at     timestamptz not null default now()
);

create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  occurred_on  date not null,
  amount_cents bigint not null,
  description  text not null default '',
  merchant_key text,
  category     text not null default 'Other' check (category in (
    'Groceries', 'Dining', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'
  )),
  is_one_off   boolean not null default false,
  source       text not null check (source in ('manual', 'csv')),
  -- Deleting an import (undo) deletes its transactions.
  import_id    uuid references public.imports (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index transactions_user_occurred_on_idx on public.transactions (user_id, occurred_on);
create index transactions_import_id_idx on public.transactions (import_id);

create table public.merchant_categories (
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  merchant_key text not null,
  category     text not null check (category in (
    'Groceries', 'Dining', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'
  )),
  primary key (user_id, merchant_key)
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.budgets enable row level security;
alter table public.imports enable row level security;
alter table public.transactions enable row level security;
alter table public.merchant_categories enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "own budgets" on public.budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own imports" on public.imports
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own transactions" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own merchant categories" on public.merchant_categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Imports CSV rows atomically. Runs as the caller, so RLS still applies.
-- p_rows: [{ occurred_on, amount_cents, description, merchant_key, category, is_one_off }]
-- Rows that exactly match an existing transaction or an earlier row in the
-- batch (same date + amount + description) are skipped.
create function public.import_transactions(p_filename text, p_row_count int, p_rows jsonb)
returns public.imports
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_import public.imports;
  v_inserted int;
  v_total int := jsonb_array_length(p_rows);
begin
  if v_total > 5000 then
    raise exception 'Too many rows (max 5000)';
  end if;

  insert into public.imports (filename, row_count, imported_count, skipped_count)
  values (p_filename, p_row_count, 0, 0)
  returning * into v_import;

  with incoming as (
    select distinct on (r.occurred_on, r.amount_cents, r.description)
      r.occurred_on, r.amount_cents, r.description, r.merchant_key,
      coalesce(r.category, 'Other') as category, coalesce(r.is_one_off, false) as is_one_off
    from jsonb_to_recordset(p_rows) as r(
      occurred_on date, amount_cents bigint, description text,
      merchant_key text, category text, is_one_off boolean
    )
  )
  insert into public.transactions
    (occurred_on, amount_cents, description, merchant_key, category, is_one_off, source, import_id)
  select i.occurred_on, i.amount_cents, i.description, i.merchant_key, i.category, i.is_one_off,
         'csv', v_import.id
  from incoming i
  where not exists (
    select 1 from public.transactions t
    where t.user_id = (select auth.uid())
      and t.occurred_on = i.occurred_on
      and t.amount_cents = i.amount_cents
      and t.description = i.description
  );
  get diagnostics v_inserted = row_count;

  update public.imports
  set imported_count = v_inserted,
      skipped_count = p_row_count - v_inserted
  where id = v_import.id
  returning * into v_import;

  return v_import;
end;
$$;

revoke execute on function public.import_transactions(text, int, jsonb) from public, anon;
grant execute on function public.import_transactions(text, int, jsonb) to authenticated;

-- Deletes the calling user's auth account; all their rows cascade.
-- Avoids needing the service-role key anywhere in the app.
create function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
