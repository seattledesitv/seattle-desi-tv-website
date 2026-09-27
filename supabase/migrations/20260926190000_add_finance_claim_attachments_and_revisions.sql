create table if not exists public.finance_expense_attachments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  expense_id uuid not null references public.finance_expenses(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_expense_revisions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  expense_id uuid not null references public.finance_expenses(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  change_note text,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  unique (expense_id, revision_number)
);

create index if not exists finance_expense_attachments_expense_idx
  on public.finance_expense_attachments (site_id, expense_id, created_at);
create index if not exists finance_expense_revisions_expense_idx
  on public.finance_expense_revisions (site_id, expense_id, revision_number desc);

alter table public.finance_expense_attachments enable row level security;
alter table public.finance_expense_revisions enable row level security;
revoke all on public.finance_expense_attachments from anon, authenticated;
revoke all on public.finance_expense_revisions from anon, authenticated;
grant all on public.finance_expense_attachments to service_role;
grant all on public.finance_expense_revisions to service_role;

comment on table public.finance_expense_attachments is
  'Append-only private supporting files for expense and mileage claims.';
comment on table public.finance_expense_revisions is
  'Append-only snapshots preserving the initial claim and every later submitter or administrator update.';
