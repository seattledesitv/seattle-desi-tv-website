create table if not exists public.final_approval_notifications (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  entity_type text not null check (entity_type in ('story','event','organization','business')),
  entity_id uuid not null,
  recipient_email text not null,
  public_url text not null,
  provider_message_id text,
  status text not null default 'sent' check (status in ('sent','failed','skipped')),
  error_message text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (site_id, entity_type, entity_id)
);

alter table public.final_approval_notifications enable row level security;
drop policy if exists "Admins read final approval notifications" on public.final_approval_notifications;
create policy "Admins read final approval notifications" on public.final_approval_notifications
  for select to authenticated using (public.sdtv_is_admin());

comment on table public.final_approval_notifications is
  'Idempotency ledger for one final published/approved email per public entity.';
