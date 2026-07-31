-- Publishing Platform Sprint 11: safe test and subscriber email delivery.

alter table public.publication_publish_attempts
drop constraint if exists publication_publish_attempts_action_check;

alter table public.publication_publish_attempts
add constraint publication_publish_attempts_action_check
check (action in ('generate','schedule','publish','retry','cancel','email_test','email_send'));

create table if not exists public.publication_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  output_id uuid not null references public.publication_outputs(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  email text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (output_id, email)
);

create index if not exists publication_email_deliveries_output_status_idx
on public.publication_email_deliveries(output_id, status);

alter table public.publication_email_deliveries enable row level security;
drop policy if exists "Admins manage publication email deliveries" on public.publication_email_deliveries;
create policy "Admins manage publication email deliveries" on public.publication_email_deliveries for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

comment on table public.publication_email_deliveries is 'Per-subscriber delivery ledger used to prevent duplicate publication email sends and support safe retries.';
