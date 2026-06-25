-- Base public profile for every logged-in SDTV user.
-- Run in Supabase SQL Editor.

create table if not exists public.user_profiles (
  user_id uuid primary key,
  email text unique,
  full_name text,
  profile_photo_url text,
  role text default 'general_public',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles add column if not exists preferred_name text;
alter table public.user_profiles add column if not exists phone text;
alter table public.user_profiles add column if not exists city text;
alter table public.user_profiles add column if not exists state text;
alter table public.user_profiles add column if not exists country text;
alter table public.user_profiles add column if not exists short_bio text;
alter table public.user_profiles add column if not exists instagram_url text;
alter table public.user_profiles add column if not exists facebook_url text;
alter table public.user_profiles add column if not exists linkedin_url text;
alter table public.user_profiles add column if not exists website_url text;
alter table public.user_profiles add column if not exists youtube_url text;
alter table public.user_profiles add column if not exists interests text[] default '{}';
alter table public.user_profiles add column if not exists show_name_publicly boolean default false;
alter table public.user_profiles add column if not exists allow_social_credit boolean default true;
alter table public.user_profiles add column if not exists allow_sdtv_contact boolean default true;
alter table public.user_profiles add column if not exists keep_profile_private boolean default true;
alter table public.user_profiles add column if not exists public_visibility_disabled boolean default false;
alter table public.user_profiles add column if not exists visibility_disabled_reason text;
alter table public.user_profiles add column if not exists visibility_disabled_at timestamptz;
alter table public.user_profiles add column if not exists visibility_disabled_by text;

create index if not exists user_profiles_email_idx on public.user_profiles(email);
create index if not exists user_profiles_role_idx on public.user_profiles(role);
create index if not exists user_profiles_visibility_idx on public.user_profiles(public_visibility_disabled);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Admins can read all profiles" on public.user_profiles;
create policy "Admins can read all profiles"
on public.user_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and lower(a.role) like '%admin%'
  )
);

drop policy if exists "Admins can update user visibility controls" on public.user_profiles;
create policy "Admins can update user visibility controls"
on public.user_profiles
for update
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and lower(a.role) like '%admin%'
  )
)
with check (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and lower(a.role) like '%admin%'
  )
);
