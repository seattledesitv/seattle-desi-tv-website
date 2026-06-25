-- Volunteer onboarding workflow helper SQL
-- Run this in Supabase SQL Editor if you want database-side support for the SDTV volunteer flow.

create table if not exists public.volunteer_onboarding_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  volunteer_request_id uuid,
  full_name text not null,
  phone text not null,
  city text,
  interests text,
  availability text,
  experience text,
  photo_url text,
  emergency_contact text,
  emergency_phone text,
  agreement_acknowledged boolean not null default false,
  agreement_acknowledged_at timestamptz,
  agreement_text text,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.volunteer_onboarding_submissions add column if not exists agreement_text text;

alter table public.volunteer_onboarding_submissions enable row level security;

drop policy if exists "Users can insert own onboarding" on public.volunteer_onboarding_submissions;
create policy "Users can insert own onboarding"
on public.volunteer_onboarding_submissions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own onboarding" on public.volunteer_onboarding_submissions;
create policy "Users can view own onboarding"
on public.volunteer_onboarding_submissions
for select
using (auth.uid() = user_id);

drop policy if exists "Admins can manage onboarding" on public.volunteer_onboarding_submissions;
create policy "Admins can manage onboarding"
on public.volunteer_onboarding_submissions
for all
using (
  exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
      and a.role in ('super_admin', 'pm_admin', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
      and a.role in ('super_admin', 'pm_admin', 'admin')
  )
);

alter table public.user_role_requests
drop constraint if exists user_role_requests_status_check;

alter table public.user_role_requests
add constraint user_role_requests_status_check
check (
  status in (
    'pending',
    'approved',
    'rejected',
    'awaiting_orientation',
    'awaiting_onboarding',
    'awaiting_team_role_access'
  )
);

-- Safety net: when onboarding is submitted, move the matching volunteer request
-- to awaiting_team_role_access even if the client-side update fails.
create or replace function public.mark_volunteer_onboarding_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_role_requests
  set status = 'awaiting_team_role_access'
  where id = new.volunteer_request_id
    and requested_role = 'volunteer'
    and status = 'awaiting_onboarding';

  return new;
end;
$$;

drop trigger if exists volunteer_onboarding_submitted_status on public.volunteer_onboarding_submissions;
create trigger volunteer_onboarding_submitted_status
after insert on public.volunteer_onboarding_submissions
for each row
execute function public.mark_volunteer_onboarding_submitted();