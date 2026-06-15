-- SDTV MVP launch hardening
-- Run in Supabase SQL Editor before external tester handoff.
-- Purpose: prevent duplicate submissions and duplicate workflow rows even if users double-click or resubmit.

-- 1) Prevent duplicate pending/approved event submissions by same creator for same title/date.
-- This still allows legitimate recurring events on different dates.
create unique index if not exists events_creator_title_date_unique
on public.events (created_by, lower(trim(title)), date)
where created_by is not null
  and status in ('pending', 'approved', 'on_hold');

-- 2) Prevent duplicate business listings by same normalized name + address.
create unique index if not exists local_businesses_name_address_unique
on public.local_businesses (lower(trim(name)), lower(trim(address)))
where status in ('pending', 'approved', 'on_hold');

-- 3) Prevent duplicate onboarding submissions by same user while active.
create unique index if not exists volunteer_onboarding_user_active_unique
on public.volunteer_onboarding_submissions (user_id)
where user_id is not null
  and status in ('submitted', 'pending', 'awaiting_team_role_access');

-- 4) Prevent duplicate role requests by same user/email + requested role while active.
create unique index if not exists user_role_requests_user_role_active_unique
on public.user_role_requests (user_id, requested_role)
where user_id is not null
  and status in ('pending', 'awaiting_orientation', 'awaiting_onboarding', 'awaiting_team_role_access', 'approved');

create unique index if not exists user_role_requests_email_role_active_unique
on public.user_role_requests (lower(trim(email)), requested_role)
where email is not null
  and status in ('pending', 'awaiting_orientation', 'awaiting_onboarding', 'awaiting_team_role_access', 'approved');

-- 5) Prevent duplicate crew / coverage requests for the same event and user.
create unique index if not exists event_crew_assignment_unique_request
on public.event_crew_assignments (event_id, user_id, assignment_type)
where user_id is not null
  and status in ('pending', 'approved', 'on_hold');

-- 6) Ensure public visibility columns have safe defaults.
alter table public.team_members
add column if not exists show_on_public_team boolean not null default true;

alter table public.radio_team_members
add column if not exists show_on_public_radio boolean not null default true;

-- 7) Ensure updated_at columns exist for admin edit pages.
alter table public.team_members
add column if not exists updated_at timestamptz not null default now();

alter table public.radio_team_members
add column if not exists updated_at timestamptz not null default now();

alter table public.local_businesses
add column if not exists updated_at timestamptz not null default now();

alter table public.events
add column if not exists updated_at timestamptz not null default now();
