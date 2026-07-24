-- Business Workflow v2
-- One idempotent migration for outreach, claim, correction, opt-out,
-- logo-rights review, resend tracking, and the business activity timeline.
--
-- Safe to run once in the Supabase SQL editor. Most statements are also
-- idempotent so rerunning after a partial failure should be safe.

begin;

-- ---------------------------------------------------------------------------
-- 1. Business outreach and owner-response fields
-- ---------------------------------------------------------------------------

alter table public.local_businesses
  add column if not exists contact_email text,
  add column if not exists outreach_status text not null default 'not_sent',
  add column if not exists outreach_sent_at timestamptz,
  add column if not exists outreach_response_due_at timestamptz,
  add column if not exists outreach_message_id text,
  add column if not exists outreach_recipient text,
  add column if not exists outreach_send_count integer not null default 0,
  add column if not exists last_outreach_sent_at timestamptz,
  add column if not exists claim_token uuid default gen_random_uuid(),
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by text,
  add column if not exists owner_verified boolean not null default false,
  add column if not exists owner_response text,
  add column if not exists owner_response_type text,
  add column if not exists owner_response_notes text,
  add column if not exists owner_response_at timestamptz,
  add column if not exists opted_out_at timestamptz,
  add column if not exists opt_out_reason text,
  add column if not exists logo_rights_status text not null default 'unknown',
  add column if not exists logo_source_url text,
  add column if not exists logo_reviewed_by text,
  add column if not exists logo_reviewed_at timestamptz;

-- Use the existing POC email as the initial contact email where available.
update public.local_businesses
set contact_email = nullif(lower(trim(poc_email)), '')
where contact_email is null
  and nullif(trim(poc_email), '') is not null;

-- Ensure every existing business has a public response token.
update public.local_businesses
set claim_token = gen_random_uuid()
where claim_token is null;

alter table public.local_businesses
  alter column claim_token set default gen_random_uuid(),
  alter column claim_token set not null;

-- ---------------------------------------------------------------------------
-- 2. Valid workflow values
-- ---------------------------------------------------------------------------

alter table public.local_businesses
  drop constraint if exists local_businesses_outreach_status_check;

alter table public.local_businesses
  add constraint local_businesses_outreach_status_check
  check (
    outreach_status in (
      'not_sent',
      'notice_ready',
      'notice_sent',
      'awaiting_response',
      'claimed',
      'correction_requested',
      'approved_as_shown',
      'owner_verified',
      'ready_to_publish',
      'published',
      'opted_out',
      'send_failed'
    )
  );

alter table public.local_businesses
  drop constraint if exists local_businesses_owner_response_type_check;

alter table public.local_businesses
  add constraint local_businesses_owner_response_type_check
  check (
    owner_response_type is null
    or owner_response_type in (
      'claim',
      'approve_as_shown',
      'correction_requested',
      'opt_out'
    )
  );

alter table public.local_businesses
  drop constraint if exists local_businesses_logo_rights_status_check;

alter table public.local_businesses
  add constraint local_businesses_logo_rights_status_check
  check (
    logo_rights_status in (
      'unknown',
      'official_site_review_needed',
      'owner_uploaded',
      'owner_approved',
      'permission_confirmed',
      'registered_mark_signal',
      'trademark_claimed',
      'do_not_use'
    )
  );

alter table public.local_businesses
  drop constraint if exists local_businesses_outreach_send_count_check;

alter table public.local_businesses
  add constraint local_businesses_outreach_send_count_check
  check (outreach_send_count >= 0);

-- ---------------------------------------------------------------------------
-- 3. Indexes used by Studio filters, deadlines, and public response links
-- ---------------------------------------------------------------------------

create unique index if not exists local_businesses_claim_token_key
  on public.local_businesses(claim_token);

create index if not exists local_businesses_outreach_status_idx
  on public.local_businesses(outreach_status);

create index if not exists local_businesses_outreach_response_due_idx
  on public.local_businesses(outreach_response_due_at)
  where outreach_response_due_at is not null;

create index if not exists local_businesses_contact_email_idx
  on public.local_businesses(lower(contact_email))
  where contact_email is not null;

create index if not exists local_businesses_owner_verified_idx
  on public.local_businesses(owner_verified);

create index if not exists local_businesses_opted_out_idx
  on public.local_businesses(opted_out_at)
  where opted_out_at is not null;

create index if not exists local_businesses_logo_rights_status_idx
  on public.local_businesses(logo_rights_status);

-- ---------------------------------------------------------------------------
-- 4. Business activity timeline
-- ---------------------------------------------------------------------------

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

create index if not exists business_activity_log_type_idx
  on public.business_activity_log(activity_type);

alter table public.business_activity_log enable row level security;

drop policy if exists "Admins can read business activity" on public.business_activity_log;
create policy "Admins can read business activity"
on public.business_activity_log
for select
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
);

drop policy if exists "Admins can create business activity" on public.business_activity_log;
create policy "Admins can create business activity"
on public.business_activity_log
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
);

-- Service-role API routes can update timeline records regardless of RLS.
-- Direct authenticated deletion/update is intentionally not enabled so the
-- timeline remains an audit history.

-- ---------------------------------------------------------------------------
-- 5. Helpful schema documentation
-- ---------------------------------------------------------------------------

comment on column public.local_businesses.contact_email is
  'Business email used for listing notices; initially backfilled from poc_email when available.';

comment on column public.local_businesses.outreach_response_due_at is
  'Default owner review deadline, normally 14 days after the listing notice is sent.';

comment on column public.local_businesses.claim_token is
  'Opaque token used by the public claim, approval, correction, and opt-out response flow.';

comment on column public.local_businesses.outreach_send_count is
  'Number of listing-notice emails sent, including intentional resends.';

comment on column public.local_businesses.owner_response_type is
  'Structured owner response used for reporting; owner_response remains for backward compatibility.';

comment on column public.local_businesses.logo_rights_status is
  'Administrative review signal only; it is not a legal determination of trademark or copyright ownership.';

comment on table public.business_activity_log is
  'Append-only audit timeline for business research, outreach, claim, correction, opt-out, verification, and publication events.';

commit;
