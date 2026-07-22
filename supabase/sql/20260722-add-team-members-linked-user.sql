-- Production compatibility fix for Volunteer Management -> Team page sync.
-- Safe to run more than once.

alter table public.team_members
  add column if not exists linked_user uuid;

create index if not exists team_members_linked_user_idx
  on public.team_members (linked_user);

comment on column public.team_members.linked_user is
  'Supabase auth user id linked to this public team member profile.';

-- Ask PostgREST to refresh its schema cache immediately.
notify pgrst, 'reload schema';
