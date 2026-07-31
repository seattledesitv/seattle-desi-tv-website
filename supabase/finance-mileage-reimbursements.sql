-- Finance Mileage / Reimbursement V1 extension

alter table public.finance_expenses add column if not exists expense_type text not null default 'expense';
alter table public.finance_expenses add column if not exists reimbursement_status text not null default 'submitted';
alter table public.finance_expenses add column if not exists reimbursee_name text;
alter table public.finance_expenses add column if not exists reimbursee_email text;
alter table public.finance_expenses add column if not exists miles numeric(10,2);
alter table public.finance_expenses add column if not exists rate_per_mile numeric(10,4);
alter table public.finance_expenses add column if not exists trip_from text;
alter table public.finance_expenses add column if not exists trip_to text;
alter table public.finance_expenses add column if not exists trip_purpose text;
alter table public.finance_expenses add column if not exists paid_at timestamptz;
alter table public.finance_expenses add column if not exists paid_by uuid;
alter table public.finance_expenses add column if not exists paid_by_email text;

alter table public.finance_expenses drop constraint if exists finance_expenses_reimbursement_status_check;
alter table public.finance_expenses add constraint finance_expenses_reimbursement_status_check
check (reimbursement_status in ('submitted','approved','paid','rejected'));

alter table public.finance_expenses drop constraint if exists finance_expenses_expense_type_check;
alter table public.finance_expenses add constraint finance_expenses_expense_type_check
check (expense_type in ('expense','mileage'));

create index if not exists finance_expenses_reimbursement_status_idx on public.finance_expenses (reimbursement_status);
create index if not exists finance_expenses_expense_type_idx on public.finance_expenses (expense_type);
