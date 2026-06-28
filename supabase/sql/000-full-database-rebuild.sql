-- Seattle Desi TV full database rebuild baseline
-- Purpose: recreate the application database schema for the current website code.
-- Safe to run on a fresh Supabase project. Mostly idempotent using IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- After running this, add at least one admin row in public.admins for Studio access.

create extension if not exists pgcrypto;

create or replace function public.is_sdtv_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Core auth/admin/profile tables
create table if not exists public.admins (
  user_id uuid primary key,
  email text unique,
  role text not null default 'admin',
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  email text unique,
  full_name text,
  display_name text,
  phone text,
  role text default 'general_public',
  profile_photo_url text,
  bio text,
  city text,
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Public content
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date date,
  time text,
  start_time timestamptz,
  end_time timestamptz,
  location text,
  address text,
  organizer text,
  organizer_name text,
  organizer_email text,
  organizer_phone text,
  poc_name text,
  poc_email text,
  poc_phone text,
  website text,
  ticket_url text,
  category text,
  status text not null default 'pending',
  featured boolean not null default false,
  image_urls text[] not null default '{}',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_status_idx on public.events(status);
create index if not exists events_date_idx on public.events(date);
create index if not exists events_featured_idx on public.events(featured);

create table if not exists public.local_businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  address text,
  city text,
  state text,
  category text,
  discount text,
  offer text,
  website text,
  phone text,
  email text,
  poc_name text,
  poc_email text,
  poc_phone text,
  status text not null default 'pending',
  featured boolean not null default false,
  image_urls text[] not null default '{}',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists local_businesses_status_idx on public.local_businesses(status);
create index if not exists local_businesses_category_idx on public.local_businesses(category);

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  subject text,
  message text,
  request_type text,
  status text not null default 'new',
  assigned_to uuid,
  notes text,
  source_page text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contact_requests_status_idx on public.contact_requests(status);

-- Team / radio / people
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  bio text,
  image text,
  image_url text,
  id_image text,
  linked_user uuid,
  user_id uuid,
  email text,
  display_order int default 0,
  show_on_public_team boolean not null default true,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_members_public_idx on public.team_members(show_on_public_team);

create table if not exists public.radio_team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  segment_name text,
  bio text,
  image text,
  image_url text,
  linked_user uuid,
  user_id uuid,
  email text,
  display_order int default 0,
  show_on_public_radio boolean not null default true,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists radio_team_members_public_idx on public.radio_team_members(show_on_public_radio);

create table if not exists public.volunteer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text unique,
  full_name text,
  phone text,
  city text,
  interests text,
  skills text,
  availability text,
  photo_url text,
  agreement_acknowledged boolean default false,
  agreement_acknowledged_at timestamptz,
  status text default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  requested_role text not null,
  status text not null default 'pending',
  notes text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz
);
create index if not exists user_role_requests_status_idx on public.user_role_requests(status);

-- Event operations and coverage
create table if not exists public.event_crew_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  event_title text,
  user_id uuid,
  user_email text,
  assignment_type text,
  role text,
  status text not null default 'assigned',
  coverage_completed boolean not null default false,
  completed_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists event_crew_assignments_event_idx on public.event_crew_assignments(event_id);
create index if not exists event_crew_assignments_user_idx on public.event_crew_assignments(user_id);

create table if not exists public.event_coverage_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  source_type text,
  url text,
  title text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.event_crew_media_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  assignment_id uuid,
  user_id uuid,
  user_email text,
  media_type text,
  url text,
  notes text,
  status text default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_coverage_briefs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  title text,
  brief text,
  notes text,
  status text default 'draft',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_workflows (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  event_title text,
  status text not null default 'ready_for_editing',
  editor_user uuid,
  editor_email text,
  notes text,
  source_folder_url text,
  source_alt_url text,
  highlight_url text,
  full_video_url text,
  review_notes text,
  published_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists video_workflows_event_idx on public.video_workflows(event_id);

create table if not exists public.event_video_analytics (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  video_url text,
  platform text,
  views int default 0,
  likes int default 0,
  comments int default 0,
  shares int default 0,
  captured_at timestamptz not null default now()
);

-- Influencer workflow
create table if not exists public.influencer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text unique,
  name text,
  handle text,
  platform text,
  bio text,
  profile_image_url text,
  id_image_url text,
  status text default 'pending',
  public_display_enabled boolean not null default true,
  display_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.influencer_coverage_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  influencer_user_id uuid,
  influencer_email text,
  influencer_name text,
  status text not null default 'requested',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists influencer_coverage_requests_event_idx on public.influencer_coverage_requests(event_id);

-- Homepage / social / content settings
create table if not exists public.homepage_settings (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,
  display_order int not null default 0,
  enabled boolean not null default true,
  title text,
  subtitle text,
  settings_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.featured_social (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  title text,
  url text not null,
  thumbnail_url text,
  description text,
  display_order int default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  text text,
  image_url text,
  display_order int default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  tier text,
  website text,
  logo_url text,
  image_url text,
  description text,
  display_order int default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hero_settings (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null default 'home',
  title text,
  subtitle text,
  cta_label text,
  cta_url text,
  image_url text,
  enabled boolean default true,
  settings_json jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Community directories and public submissions
create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  platform text,
  url text,
  category text,
  city text,
  status text not null default 'pending',
  image_urls text[] not null default '{}',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_groups_status_idx on public.community_groups(status);

create table if not exists public.community_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  website text,
  category text,
  city text,
  contact_email text,
  contact_phone text,
  status text not null default 'pending',
  image_urls text[] not null default '{}',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_organizations_status_idx on public.community_organizations(status);

create table if not exists public.public_content_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  title text,
  name text,
  email text,
  phone text,
  description text,
  url text,
  image_urls text[] not null default '{}',
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Newsletter
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  status text not null default 'active' check (status in ('active','pending','unsubscribed')),
  source_page text,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  unsubscribe_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists newsletter_subscribers_status_idx on public.newsletter_subscribers(status);

create table if not exists public.newsletter_settings (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,
  display_order int not null default 0,
  enabled boolean not null default true,
  title text,
  max_items int not null default 4,
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preheader text,
  status text not null default 'draft' check (status in ('draft','test_sent','sent','archived')),
  draft_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_by_email text,
  test_sent_to text,
  test_sent_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists newsletter_campaigns_status_idx on public.newsletter_campaigns(status);

-- Generic notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  title text not null,
  message text,
  link_url text,
  status text not null default 'unread',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_email_idx on public.notifications(email);

-- Enable RLS
alter table public.admins enable row level security;
alter table public.user_profiles enable row level security;
alter table public.events enable row level security;
alter table public.local_businesses enable row level security;
alter table public.contact_requests enable row level security;
alter table public.team_members enable row level security;
alter table public.radio_team_members enable row level security;
alter table public.volunteer_profiles enable row level security;
alter table public.user_role_requests enable row level security;
alter table public.event_crew_assignments enable row level security;
alter table public.event_coverage_sources enable row level security;
alter table public.event_crew_media_submissions enable row level security;
alter table public.event_coverage_briefs enable row level security;
alter table public.video_workflows enable row level security;
alter table public.event_video_analytics enable row level security;
alter table public.influencer_profiles enable row level security;
alter table public.influencer_coverage_requests enable row level security;
alter table public.homepage_settings enable row level security;
alter table public.featured_social enable row level security;
alter table public.testimonials enable row level security;
alter table public.sponsors enable row level security;
alter table public.hero_settings enable row level security;
alter table public.community_groups enable row level security;
alter table public.community_organizations enable row level security;
alter table public.public_content_requests enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_settings enable row level security;
alter table public.newsletter_campaigns enable row level security;
alter table public.notifications enable row level security;

-- Public read policies for approved/public content
create policy if not exists events_public_read on public.events for select using (status in ('approved','published') or public.is_sdtv_admin());
create policy if not exists local_businesses_public_read on public.local_businesses for select using (status in ('approved','published') or public.is_sdtv_admin());
create policy if not exists team_public_read on public.team_members for select using (show_on_public_team = true or public.is_sdtv_admin());
create policy if not exists radio_public_read on public.radio_team_members for select using (show_on_public_radio = true or public.is_sdtv_admin());
create policy if not exists community_groups_public_read on public.community_groups for select using (status in ('approved','published') or public.is_sdtv_admin());
create policy if not exists community_orgs_public_read on public.community_organizations for select using (status in ('approved','published') or public.is_sdtv_admin());
create policy if not exists featured_social_public_read on public.featured_social for select using (enabled = true or public.is_sdtv_admin());
create policy if not exists testimonials_public_read on public.testimonials for select using (enabled = true or public.is_sdtv_admin());
create policy if not exists sponsors_public_read on public.sponsors for select using (enabled = true or public.is_sdtv_admin());
create policy if not exists homepage_settings_public_read on public.homepage_settings for select using (enabled = true or public.is_sdtv_admin());
create policy if not exists hero_settings_public_read on public.hero_settings for select using (enabled = true or public.is_sdtv_admin());
create policy if not exists influencer_profiles_public_read on public.influencer_profiles for select using ((status = 'approved' and public_display_enabled = true) or public.is_sdtv_admin());

-- Public inserts for forms
create policy if not exists events_public_insert on public.events for insert to anon, authenticated with check (true);
create policy if not exists local_businesses_public_insert on public.local_businesses for insert to anon, authenticated with check (true);
create policy if not exists contact_requests_public_insert on public.contact_requests for insert to anon, authenticated with check (true);
create policy if not exists public_content_requests_public_insert on public.public_content_requests for insert to anon, authenticated with check (true);
create policy if not exists newsletter_subscribers_public_select on public.newsletter_subscribers for select to anon, authenticated using (true);
create policy if not exists newsletter_subscribers_public_insert on public.newsletter_subscribers for insert to anon, authenticated with check (true);
create policy if not exists newsletter_subscribers_public_update on public.newsletter_subscribers for update to anon, authenticated using (true) with check (true);

-- Authenticated users can view/update their own profile/requests/assignments
create policy if not exists user_profiles_self_select on public.user_profiles for select to authenticated using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email','')) or public.is_sdtv_admin());
create policy if not exists user_profiles_self_upsert on public.user_profiles for insert to authenticated with check (user_id = auth.uid() or public.is_sdtv_admin());
create policy if not exists user_profiles_self_update on public.user_profiles for update to authenticated using (user_id = auth.uid() or public.is_sdtv_admin()) with check (user_id = auth.uid() or public.is_sdtv_admin());
create policy if not exists role_requests_self_read on public.user_role_requests for select to authenticated using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email','')) or public.is_sdtv_admin());
create policy if not exists role_requests_self_insert on public.user_role_requests for insert to authenticated with check (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email','')) or public.is_sdtv_admin());
create policy if not exists crew_self_read on public.event_crew_assignments for select to authenticated using (user_id = auth.uid() or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email','')) or public.is_sdtv_admin());
create policy if not exists notifications_self_read on public.notifications for select to authenticated using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email','')) or public.is_sdtv_admin());

-- Admin full access policies
create policy if not exists admins_admin_all on public.admins for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists events_admin_all on public.events for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists local_businesses_admin_all on public.local_businesses for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists contact_requests_admin_all on public.contact_requests for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists team_admin_all on public.team_members for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists radio_admin_all on public.radio_team_members for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists volunteer_admin_all on public.volunteer_profiles for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists role_requests_admin_all on public.user_role_requests for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists event_crew_admin_all on public.event_crew_assignments for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists event_sources_admin_all on public.event_coverage_sources for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists event_media_admin_all on public.event_crew_media_submissions for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists event_briefs_admin_all on public.event_coverage_briefs for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists video_workflows_admin_all on public.video_workflows for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists video_analytics_admin_all on public.event_video_analytics for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists influencer_profiles_admin_all on public.influencer_profiles for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists influencer_requests_admin_all on public.influencer_coverage_requests for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists homepage_settings_admin_all on public.homepage_settings for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists featured_social_admin_all on public.featured_social for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists testimonials_admin_all on public.testimonials for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists sponsors_admin_all on public.sponsors for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists hero_settings_admin_all on public.hero_settings for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists community_groups_admin_all on public.community_groups for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists community_orgs_admin_all on public.community_organizations for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists public_content_admin_all on public.public_content_requests for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists newsletter_settings_admin_all on public.newsletter_settings for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists newsletter_campaigns_admin_all on public.newsletter_campaigns for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());
create policy if not exists notifications_admin_all on public.notifications for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());

-- Seed default newsletter ordering
insert into public.newsletter_settings(section_key, display_order, enabled, title, max_items) values
  ('intro', 1, true, 'Opening Note', 1),
  ('events', 2, true, 'Upcoming Events', 5),
  ('tv', 3, true, 'Latest TV', 4),
  ('instagram', 4, true, 'Latest Instagram', 4),
  ('businesses', 5, true, 'Local Business Spotlight', 3),
  ('groups', 6, true, 'Community Groups', 4),
  ('organizations', 7, true, 'Community Organizations', 4),
  ('closing', 8, true, 'Stay Connected', 1)
on conflict (section_key) do update set
  display_order = excluded.display_order,
  enabled = excluded.enabled,
  title = excluded.title,
  max_items = excluded.max_items,
  updated_at = now();

-- Optional: seed homepage section ordering if table is empty
insert into public.homepage_settings(section_key, display_order, enabled, title, subtitle) values
  ('hero', 1, true, 'Seattle Desi TV', null),
  ('events', 2, true, 'Events', null),
  ('youtube', 3, true, 'Latest TV', null),
  ('instagram', 4, true, 'Latest From Instagram', null),
  ('testimonials', 5, true, 'Community Voices', null),
  ('radio', 6, true, 'Seattle Desi Radio', null),
  ('businesses', 7, true, 'Local Businesses', null),
  ('recognition', 8, true, 'Recognition', null)
on conflict (section_key) do nothing;

-- Add your first admin after creating/signing into the Supabase auth user:
-- insert into public.admins(user_id, email, role, name)
-- values ('YOUR-AUTH-USER-ID', 'your@email.com', 'super_admin', 'Your Name')
-- on conflict (user_id) do update set email = excluded.email, role = excluded.role, name = excluded.name;
