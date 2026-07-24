-- Business directory outreach, claim, correction and opt-out workflow.
alter table public.local_businesses
  add column if not exists outreach_status text not null default 'not_sent',
  add column if not exists outreach_sent_at timestamptz,
  add column if not exists outreach_response_due_at timestamptz,
  add column if not exists outreach_message_id text,
  add column if not exists outreach_recipient text,
  add column if not exists claim_token uuid default gen_random_uuid(),
  add column if not exists claimed_at timestamptz,
  add column if not exists opted_out_at timestamptz,
  add column if not exists owner_response text,
  add column if not exists owner_response_at timestamptz,
  add column if not exists logo_rights_status text not null default 'unknown';

create unique index if not exists local_businesses_claim_token_key
  on public.local_businesses(claim_token);

alter table public.local_businesses drop constraint if exists local_businesses_outreach_status_check;
alter table public.local_businesses add constraint local_businesses_outreach_status_check
  check (outreach_status in ('not_sent','notice_sent','claimed','correction_requested','opted_out','approved_as_shown','send_failed'));

alter table public.local_businesses drop constraint if exists local_businesses_logo_rights_status_check;
alter table public.local_businesses add constraint local_businesses_logo_rights_status_check
  check (logo_rights_status in ('unknown','official_site_review_needed','permission_confirmed','registered_mark_signal','trademark_claimed','do_not_use'));

create table if not exists public.business_activity_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.local_businesses(id) on delete cascade,
  activity_type text not null,
  activity_label text not null,
  details jsonb not null default '{}'::jsonb,
  actor_email text,
  created_at timestamptz not null default now()
);

create index if not exists business_activity_log_business_created_idx
  on public.business_activity_log(business_id, created_at desc);

alter table public.business_activity_log enable row level security;

drop policy if exists "Admins can read business activity" on public.business_activity_log;
create policy "Admins can read business activity" on public.business_activity_log
for select to authenticated using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid() or lower(a.email) = lower(coalesce(auth.jwt()->>'email',''))
  )
);

drop policy if exists "Admins can create business activity" on public.business_activity_log;
create policy "Admins can create business activity" on public.business_activity_log
for insert to authenticated with check (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid() or lower(a.email) = lower(coalesce(auth.jwt()->>'email',''))
  )
);

comment on column public.local_businesses.outreach_response_due_at is 'Default review deadline is 14 days after the listing notice is sent.';
comment on column public.local_businesses.claim_token is 'Opaque token used by the public claim/correction/opt-out response flow.';