-- SDTV team profile enhancements
-- Run this in Supabase SQL Editor before using the new team profile publishing/editing flow.

-- Allow a team member row to be linked back to an auth user.
alter table public.team_members
add column if not exists user_id uuid,
add column if not exists email text,
add column if not exists show_on_public_team boolean not null default true,
add column if not exists updated_at timestamptz not null default now();

-- Make user_id unique only when present so admins can still keep manually-created team rows.
create unique index if not exists team_members_user_id_unique
on public.team_members(user_id)
where user_id is not null;

-- Let users keep their own onboarding/profile details current after approval.
drop policy if exists "Users can update own onboarding" on public.volunteer_onboarding_submissions;
create policy "Users can update own onboarding"
on public.volunteer_onboarding_submissions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Helpful updated_at trigger for onboarding submissions.
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
