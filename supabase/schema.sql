-- Seattle Desi TV Supabase schema
-- Run in Supabase SQL Editor.
--
-- NOTE: This file is being refreshed from production metadata.
-- The table section below is still an older partial schema. The storage section
-- has been updated from the production storage policy export.
--
-- Production public table inventory captured from Supabase on 2026-06-30:
-- admins
-- community_groups
-- community_organizations
-- contact_requests
-- crew_availability
-- event_coverage_sources
-- event_crew_assignments
-- event_crew_media_submissions
-- event_deliverables
-- event_influencer_intents
-- event_video_notifications
-- event_video_revisions
-- event_video_workflows
-- events
-- featured_social_content
-- festival_hero_assets
-- hero_analytics
-- homepage_hero_banners
-- homepage_settings
-- homepage_sponsors
-- homepage_testimonials
-- influencer_profiles
-- local_businesses
-- newsletter_campaigns
-- newsletter_settings
-- newsletter_subscribers
-- notifications
-- public_content_requests
-- public_visibility_controls
-- radio_team_members
-- social_media_stats
-- sponsors
-- team_members
-- user_profiles
-- user_role_requests
-- volunteer_onboarding_submissions

create extension if not exists "pgcrypto";

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'admin',
  created_at timestamptz default now()
);

alter table public.admins enable row level security;
drop policy if exists "Users can read their own admin row" on public.admins;
create policy "Users can read their own admin row"
on public.admins for select to authenticated
using (user_id = auth.uid() or email = auth.jwt() ->> 'email');

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  location text not null,
  description text,
  ticket_url text,
  poc_email text,
  poc_phone text,
  image text,
  crew_member_ids uuid[] default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.events enable row level security;
drop policy if exists "Anyone can view events" on public.events;
drop policy if exists "Logged in users can create events" on public.events;
drop policy if exists "Admins can update events" on public.events;
create policy "Anyone can view events" on public.events for select to public using (true);
create policy "Logged in users can create events" on public.events for insert to authenticated with check (auth.uid() = created_by);
create policy "Admins can update events" on public.events for update to authenticated using (
  exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%')
) with check (
  exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%')
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  image text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.team_members enable row level security;
drop policy if exists "Anyone can view team members" on public.team_members;
drop policy if exists "Admins can add team members" on public.team_members;
create policy "Anyone can view team members" on public.team_members for select to public using (true);
create policy "Admins can add team members" on public.team_members for insert to authenticated with check (
  exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%')
);

create table if not exists public.radio_team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  segment_name text not null,
  image text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.radio_team_members enable row level security;
drop policy if exists "Anyone can view radio team members" on public.radio_team_members;
drop policy if exists "Admins can add radio team members" on public.radio_team_members;
create policy "Anyone can view radio team members" on public.radio_team_members for select to public using (true);
create policy "Admins can add radio team members" on public.radio_team_members for insert to authenticated with check (
  exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%')
);

create table if not exists public.event_crew_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  assignment_type text default 'self_selected',
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

alter table public.event_crew_assignments enable row level security;
drop policy if exists "Anyone can view event crew" on public.event_crew_assignments;
drop policy if exists "Crew users can join event crew" on public.event_crew_assignments;
create policy "Anyone can view event crew" on public.event_crew_assignments for select to public using (true);
create policy "Crew users can join event crew" on public.event_crew_assignments for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
    and (lower(a.role) like '%crew%' or lower(a.role) like '%admin%')
  )
);

create table if not exists public.local_businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  website text,
  category text,
  discount text,
  offer text,
  poc_name text,
  poc_email text,
  poc_phone text,
  image text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.local_businesses enable row level security;
drop policy if exists "Anyone can view local businesses" on public.local_businesses;
drop policy if exists "Logged in users can create local businesses" on public.local_businesses;
create policy "Anyone can view local businesses" on public.local_businesses for select to public using (true);
create policy "Logged in users can create local businesses" on public.local_businesses for insert to authenticated with check (auth.uid() = created_by);

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  interest text not null,
  message text,
  created_at timestamptz default now()
);

alter table public.contact_requests enable row level security;
drop policy if exists "Anyone can submit contact requests" on public.contact_requests;
create policy "Anyone can submit contact requests" on public.contact_requests for insert to public with check (true);

-- ============================================================
-- Storage buckets and policies
-- Refreshed from production storage policy export.
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('business-images', 'business-images', true),
  ('event-images', 'event-images', true),
  ('event-posters', 'event-posters', true),
  ('radio-team-images', 'radio-team-images', true),
  ('team-images', 'team-images', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "Admins can upload radio team images" on storage.objects;
create policy "Admins can upload radio team images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'radio-team-images'
  and exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
      and lower(a.role) like '%admin%'
  )
);

drop policy if exists "Admins can upload team images" on storage.objects;
create policy "Admins can upload team images"
on storage.objects for insert to authenticated
with check (bucket_id = 'team-images');

drop policy if exists "Anyone can view business images" on storage.objects;
create policy "Anyone can view business images"
on storage.objects for select to public
using (bucket_id = 'business-images');

drop policy if exists "Anyone can view event images" on storage.objects;
create policy "Anyone can view event images"
on storage.objects for select to public
using (bucket_id = 'event-images');

drop policy if exists "Anyone can view event posters" on storage.objects;
create policy "Anyone can view event posters"
on storage.objects for select to public
using (bucket_id = 'event-posters');

drop policy if exists "Anyone can view radio team images" on storage.objects;
create policy "Anyone can view radio team images"
on storage.objects for select to public
using (bucket_id = 'radio-team-images');

drop policy if exists "Anyone can view team images" on storage.objects;
create policy "Anyone can view team images"
on storage.objects for select to public
using (bucket_id = 'team-images');

drop policy if exists "Logged in users can delete event images" on storage.objects;
create policy "Logged in users can delete event images"
on storage.objects for delete to authenticated
using (bucket_id = 'event-images');

drop policy if exists "Logged in users can delete event posters" on storage.objects;
create policy "Logged in users can delete event posters"
on storage.objects for delete to authenticated
using (bucket_id = 'event-posters');

drop policy if exists "Logged in users can update event images" on storage.objects;
create policy "Logged in users can update event images"
on storage.objects for update to authenticated
using (bucket_id = 'event-images')
with check (bucket_id = 'event-images');

drop policy if exists "Logged in users can update event posters" on storage.objects;
create policy "Logged in users can update event posters"
on storage.objects for update to authenticated
using (bucket_id = 'event-posters')
with check (bucket_id = 'event-posters');

drop policy if exists "Logged in users can upload business images" on storage.objects;
create policy "Logged in users can upload business images"
on storage.objects for insert to authenticated
with check (bucket_id = 'business-images');

drop policy if exists "Logged in users can upload event images" on storage.objects;
create policy "Logged in users can upload event images"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-images');

drop policy if exists "Logged in users can upload event posters" on storage.objects;
create policy "Logged in users can upload event posters"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-posters');
