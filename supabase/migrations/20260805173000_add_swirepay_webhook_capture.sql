create table if not exists public.swirepay_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text,
  event_type text,
  payment_gid text,
  payload jsonb not null,
  payload_sha256 text not null unique,
  signature text not null,
  signature_verified boolean not null default true,
  processing_status text not null default 'captured' check (processing_status in ('captured','mapped','processed','ignored','failed')),
  processing_notes text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists swirepay_webhook_provider_event_unique
  on public.swirepay_webhook_events(provider_event_id)
  where provider_event_id is not null;
create index if not exists swirepay_webhook_review_idx
  on public.swirepay_webhook_events(processing_status, received_at desc);

alter table public.swirepay_webhook_events enable row level security;

create policy "Admins read Swirepay webhook events" on public.swirepay_webhook_events
  for select to authenticated
  using (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%'));

create policy "Admins update Swirepay webhook review" on public.swirepay_webhook_events
  for update to authenticated
  using (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%'))
  with check (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%'));

comment on table public.swirepay_webhook_events is 'Signature-verified Swirepay webhook captures. Initial capture-only mode intentionally performs no payment activation.';
