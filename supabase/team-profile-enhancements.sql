-- SDTV team profile enhancements
-- Run this in Supabase SQL Editor before using the team/radio profile publishing/editing flow.

-- Allow a team member row to be linked back to an auth user.
alter table public.team_members
add column if not exists user_id uuid,
add column if not exists email text,
add column if not exists show_on_public_team boolean not null default true,
add column if not exists updated_at timestamptz not null default now();

-- Allow a radio team row to be linked back to an auth user and controlled publicly.
alter table public.radio_team_members
add column if not exists user_id uuid,
add column if not exists email text,
add column if not exists show_on_public_radio boolean not null default true,
add column if not exists updated_at timestamptz not null default now();

-- Make user_id unique only when present so admins can still keep manually-created rows.
create unique index if not exists team_members_user_id_unique
on public.team_members(user_id)
where user_id is not null;

create unique index if not exists radio_team_members_user_id_unique
on public.radio_team_members(user_id)
where user_id is not null;

-- Let users keep their own onboarding/profile details current after approval.
drop policy if exists "Users can update own onboarding" on public.volunteer_onboarding_submissions;
create policy "Users can update own onboarding"
on public.volunteer_onboarding_submissions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Team page RLS.
alter table public.team_members enable row level security;

drop policy if exists "Users can update own team member profile" on public.team_members;
create policy "Users can update own team member profile"
on public.team_members
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can insert own team member profile" on public.team_members;
create policy "Users can insert own team member profile"
on public.team_members
for insert
with check (auth.uid() = user_id);

drop policy if exists "Admins can manage team member profiles" on public.team_members;
create policy "Admins can manage team member profiles"
on public.team_members
for all
using (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email'))
      and lower(a.role) like '%admin%'
  )
)
with check (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email'))
      and lower(a.role) like '%admin%'
  )
);

-- Radio team RLS.
alter table public.radio_team_members enable row level security;

drop policy if exists "Admins can manage radio team profiles" on public.radio_team_members;
create policy "Admins can manage radio team profiles"
on public.radio_team_members
for all
using (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email'))
      and lower(a.role) like '%admin%'
  )
)
with check (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email'))
      and lower(a.role) like '%admin%'
  )
);

-- Helpful updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists volunteer_onboarding_set_updated_at on public.volunteer_onboarding_submissions;
create trigger volunteer_onboarding_set_updated_at
before update on public.volunteer_onboarding_submissions
for each row
execute function public.set_updated_at();

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
before update on public.team_members
for each row
execute function public.set_updated_at();

drop trigger if exists radio_team_members_set_updated_at on public.radio_team_members;
create trigger radio_team_members_set_updated_at
before update on public.radio_team_members
for each row
execute function public.set_updated_at();
