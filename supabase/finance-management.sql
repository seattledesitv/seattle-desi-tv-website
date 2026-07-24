-- Finance Management V1
-- Super-admin-only expense and mileage reimbursement tracking.
-- Bills are stored privately in Cloudflare R2; this table stores metadata and the private R2 object key only.

create extension if not exists pgcrypto;

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_type text not null default 'expense',
  expense_date date not null,
  vendor_name text not null,
  category text not null default 'other',
  amount numeric(12,2) not null check (amount > 0),
  payment_method text,
  reimbursement_status text not null default 'submitted',
  reimbursed_to text,
  mileage_miles numeric(10,2),
  mileage_rate numeric(10,4),
  paid_at timestamptz,
  description text,
  bill_file_path text,
  bill_file_name text,
  bill_mime_type text,
  bill_file_size bigint,
  created_by uuid,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_by_email text,
  updated_at timestamptz not null default now()
);

alter table public.finance_expenses add column if not exists expense_type text not null default 'expense';
alter table public.finance_expenses add column if not exists reimbursement_status text not null default 'submitted';
alter table public.finance_expenses add column if not exists reimbursed_to text;
alter table public.finance_expenses add column if not exists mileage_miles numeric(10,2);
alter table public.finance_expenses add column if not exists mileage_rate numeric(10,4);
alter table public.finance_expenses add column if not exists paid_at timestamptz;

create index if not exists finance_expenses_expense_date_idx on public.finance_expenses (expense_date desc);
create index if not exists finance_expenses_category_idx on public.finance_expenses (category);
create index if not exists finance_expenses_created_by_idx on public.finance_expenses (created_by);
create index if not exists finance_expenses_reimbursement_status_idx on public.finance_expenses (reimbursement_status);

alter table public.finance_expenses enable row level security;

-- Super admins can read finance metadata directly if needed.
drop policy if exists "finance expenses super admin select" on public.finance_expenses;
create policy "finance expenses super admin select"
on public.finance_expenses
for select
to authenticated
using (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email'))
      and lower(a.role) = 'super_admin'
  )
);

-- Inserts/updates are done through server routes with service role so files and DB rows stay consistent.
-- Keeping insert/update/delete restricted avoids accidental client-side writes.
