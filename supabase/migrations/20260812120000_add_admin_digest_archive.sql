create table if not exists public.admin_digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  delivery_type text not null check (delivery_type in ('scheduled','test')),
  status text not null default 'processing' check (status in ('processing','sent','failed')),
  recipient text not null,
  subject text not null,
  report_from timestamptz not null,
  report_to timestamptz not null,
  counts jsonb not null default '{}'::jsonb,
  provider_email_id text,
  error_message text,
  triggered_by text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists admin_digest_deliveries_created_idx on public.admin_digest_deliveries(created_at desc);
alter table public.admin_digest_deliveries enable row level security;

drop policy if exists "Admins read digest delivery archive" on public.admin_digest_deliveries;
create policy "Admins read digest delivery archive" on public.admin_digest_deliveries for select to authenticated using (
  exists (select 1 from public.admins a where (a.user_id = auth.uid() or lower(a.email) = lower(coalesce(auth.jwt()->>'email',''))) and lower(a.role) like '%admin%')
);

comment on table public.admin_digest_deliveries is 'Metadata-only audit archive for scheduled and test administrator digest emails; email bodies are not stored.';
