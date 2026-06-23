-- Influencer MVP for SDTV
-- Adds influencer profiles and event influencer collaboration intent.

create table if not exists public.influencer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  full_name text not null,
  city text,
  bio text,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  website_url text,
  photo_url text,
  niche text,
  follower_count text,
  public_listing boolean default false,
  status text default 'pending' check (status in ('pending','approved','rejected','hidden')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(email)
);

create table if not exists public.event_influencer_intents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid,
  user_email text not null,
  influencer_profile_id uuid references public.influencer_profiles(id) on delete set null,
  status text default 'pending' check (status in ('pending','approved','rejected','completed')),
  collab_note text,
  expected_platforms text,
  post_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(event_id, user_email)
);

alter table public.influencer_profiles enable row level security;
alter table public.event_influencer_intents enable row level security;

drop policy if exists "Public can view approved public influencers" on public.influencer_profiles;
create policy "Public can view approved public influencers"
on public.influencer_profiles
for select
to anon, authenticated
using (status = 'approved' and public_listing = true);

drop policy if exists "Users can view own influencer profile" on public.influencer_profiles;
create policy "Users can view own influencer profile"
on public.influencer_profiles
for select
to authenticated
using (auth.uid() = user_id or lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can upsert own influencer profile" on public.influencer_profiles;
create policy "Users can upsert own influencer profile"
on public.influencer_profiles
for all
to authenticated
using (auth.uid() = user_id or lower(email) = lower(auth.jwt() ->> 'email'))
with check (auth.uid() = user_id or lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Admins can manage influencer profiles" on public.influencer_profiles;
create policy "Admins can manage influencer profiles"
on public.influencer_profiles
for all
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email')))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email')));

drop policy if exists "Users can view own influencer intents" on public.event_influencer_intents;
create policy "Users can view own influencer intents"
on public.event_influencer_intents
for select
to authenticated
using (auth.uid() = user_id or lower(user_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can create own influencer intents" on public.event_influencer_intents;
create policy "Users can create own influencer intents"
on public.event_influencer_intents
for insert
to authenticated
with check (auth.uid() = user_id or lower(user_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Admins can manage influencer intents" on public.event_influencer_intents;
create policy "Admins can manage influencer intents"
on public.event_influencer_intents
for all
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email')))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email')));
