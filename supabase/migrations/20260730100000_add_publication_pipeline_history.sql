-- Publishing Platform Sprint 7: auditable multi-channel pipeline attempts.

alter table public.publication_outputs add column if not exists attempt_count integer not null default 0;
alter table public.publication_outputs add column if not exists last_error text;
alter table public.publication_outputs add column if not exists last_attempt_at timestamptz;
alter table public.publication_outputs add column if not exists updated_by uuid references auth.users(id) on delete set null;

create table if not exists public.publication_publish_attempts (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  campaign_id uuid references public.publication_campaigns(id) on delete cascade,
  output_id uuid references public.publication_outputs(id) on delete cascade,
  channel text not null,
  action text not null check (action in ('generate','schedule','publish','retry','cancel')),
  status text not null check (status in ('completed','failed','manual_handoff','cancelled')),
  request_snapshot jsonb not null default '{}'::jsonb,
  response_snapshot jsonb not null default '{}'::jsonb,
  error_message text,
  attempted_by uuid references auth.users(id) on delete set null,
  attempted_at timestamptz not null default now()
);

create index if not exists publication_publish_attempts_publication_idx
on public.publication_publish_attempts(publication_id, attempted_at desc);

create index if not exists publication_outputs_publication_status_idx
on public.publication_outputs(publication_id, status, channel);

alter table public.publication_publish_attempts enable row level security;
drop policy if exists "Admins manage publication publish attempts" on public.publication_publish_attempts;
create policy "Admins manage publication publish attempts" on public.publication_publish_attempts for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

comment on table public.publication_publish_attempts is 'Immutable audit trail for publication generation, scheduling, publishing, retry, and cancellation actions.';
