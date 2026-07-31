-- Seattle Desi TV full Supabase staging restore
-- Generated from captured production metadata.
-- Run on a fresh Supabase project first; review before running on any existing DB.

-- ============================================================
-- schema/extensions.sql
-- ============================================================

-- Extensions captured from production.
-- Some Supabase-managed extensions may already exist.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;



-- ============================================================
-- schema/tables.sql
-- ============================================================

-- Generated SDTV production table definitions.
-- Generated from captured information_schema.columns exports.
-- Tables: 36; captured base-table columns: 461.

create table if not exists public."admins" (
  "user_id" uuid not null,
  "email" text,
  "role" text default 'admin'::text,
  "created_at" timestamptz default now(),
  "name" text
);

create table if not exists public."community_groups" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "platform" text,
  "category" text,
  "language" text,
  "location" text,
  "description" text,
  "group_url" text,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "submitted_by" uuid,
  "submitted_email" text,
  "status" text default 'pending'::text not null,
  "approved" boolean default false not null,
  "approved_by" text,
  "approved_at" timestamptz,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."community_organizations" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "organization_type" text,
  "category" text,
  "location" text,
  "website" text,
  "description" text,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "submitted_by" uuid,
  "submitted_email" text,
  "status" text default 'pending'::text not null,
  "approved" boolean default false not null,
  "approved_by" text,
  "approved_at" timestamptz,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."contact_requests" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "email" text not null,
  "phone" text,
  "interest" text not null,
  "message" text,
  "created_at" timestamptz default now(),
  "status" text default 'new'::text,
  "source" text default 'website_contact'::text,
  "updated_at" timestamptz default now(),
  "admin_notes" text
);

create table if not exists public."crew_availability" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "user_email" text,
  "available_date" date not null,
  "status" text default 'available'::text not null,
  "note" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."event_coverage_sources" (
  "id" uuid default gen_random_uuid() not null,
  "event_id" uuid not null,
  "source_type" text not null,
  "status" text default 'pending'::text not null,
  "source_url" text,
  "platform" text,
  "contact_name" text,
  "contact_email" text,
  "notes" text,
  "requested_by" uuid,
  "requested_at" timestamptz,
  "submitted_at" timestamptz,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."event_crew_assignments" (
  "id" uuid default gen_random_uuid() not null,
  "event_id" uuid,
  "user_id" uuid,
  "assignment_type" text default 'self_selected'::text,
  "created_at" timestamptz default now(),
  "status" text default 'pending'::text,
  "user_email" text,
  "approved_by" text,
  "approved_at" timestamptz,
  "event_title" text,
  "crew_confirmed" boolean default false,
  "coverage_completed" boolean default false,
  "coverage_notes" text,
  "completed_at" timestamptz
);

create table if not exists public."event_crew_media_submissions" (
  "id" uuid default gen_random_uuid() not null,
  "assignment_id" uuid,
  "event_id" uuid,
  "user_id" uuid,
  "user_email" text,
  "has_content" boolean default true not null,
  "raw_video_url" text,
  "photos_url" text,
  "other_media_url" text,
  "notes" text,
  "status" text default 'submitted'::text not null,
  "submitted_at" timestamptz default now() not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."event_deliverables" (
  "id" uuid default gen_random_uuid() not null,
  "event_id" uuid not null,
  "deliverable_type" text not null,
  "required" boolean default true not null,
  "completed" boolean default false not null,
  "completed_by" uuid,
  "completed_by_email" text,
  "completed_at" timestamptz,
  "notes" text,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."event_influencer_intents" (
  "id" uuid default gen_random_uuid() not null,
  "event_id" uuid,
  "user_id" uuid,
  "user_email" text not null,
  "influencer_profile_id" uuid,
  "status" text default 'pending'::text,
  "collab_note" text,
  "expected_platforms" text,
  "post_url" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "approved_by" text,
  "approved_at" timestamptz
);

create table if not exists public."event_video_notifications" (
  "id" uuid default gen_random_uuid() not null,
  "workflow_id" uuid not null,
  "recipient_email" text,
  "recipient_user_id" uuid,
  "notification_type" text not null,
  "title" text not null,
  "message" text,
  "link" text,
  "is_read" boolean default false not null,
  "created_at" timestamptz default now() not null
);

create table if not exists public."event_video_revisions" (
  "id" uuid default gen_random_uuid() not null,
  "workflow_id" uuid not null,
  "revision_number" integer default 1 not null,
  "full_video_url" text,
  "reel_url" text,
  "youtube_title" text,
  "youtube_description" text,
  "instagram_caption" text,
  "thumbnail_url" text,
  "feedback" text,
  "submitted_by" uuid,
  "submitted_by_email" text,
  "created_at" timestamptz default now() not null
);

create table if not exists public."event_video_workflows" (
  "id" uuid default gen_random_uuid() not null,
  "event_id" uuid not null,
  "status" text default 'ready_for_editing'::text not null,
  "assigned_editor_email" text,
  "crew_reviewer_email" text,
  "admin_approver_email" text,
  "raw_media_url" text,
  "external_media_url" text,
  "crew_notes" text,
  "editor_notes" text,
  "publish_notes" text,
  "youtube_url" text,
  "instagram_url" text,
  "facebook_url" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null,
  "crew_approved_at" timestamptz,
  "admin_approved_at" timestamptz,
  "published_at" timestamptz
);

create table if not exists public."events" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "date" date not null,
  "location" text,
  "description" text,
  "image" text,
  "created_by" uuid,
  "created_at" timestamptz default now(),
  "ticket_url" text,
  "poc_email" text,
  "poc_phone" text,
  "crew_member_ids" uuid[] default '{}'::uuid[],
  "image_urls" text[] default '{}'::text[],
  "approved" boolean default false,
  "status" text default 'pending'::text,
  "approved_by" text,
  "approved_at" timestamptz,
  "featured" boolean default false,
  "featured_order" integer default 0,
  "coverage_brief" text,
  "required_shots" text,
  "interview_targets" text,
  "sponsor_requirements" text,
  "special_instructions" text
);

create table if not exists public."featured_social_content" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "subtitle" text,
  "platform" text default 'instagram'::text not null,
  "content_url" text not null,
  "thumbnail_url" text,
  "button_text" text default 'View Post'::text,
  "active" boolean default true,
  "featured" boolean default true,
  "display_order" integer default 1,
  "start_date" date,
  "end_date" date,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "content_type" text default 'reel'::text
);

create table if not exists public."festival_hero_assets" (
  "id" uuid default gen_random_uuid() not null,
  "festival_name" text not null,
  "festival_key" text not null,
  "title" text,
  "subtitle" text,
  "image_url" text,
  "start_date" date not null,
  "end_date" date not null,
  "active" boolean default true,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."hero_analytics" (
  "id" uuid default gen_random_uuid() not null,
  "hero_type" text,
  "hero_id" text,
  "event_id" uuid,
  "viewed_at" timestamptz default now(),
  "clicked" boolean default false,
  "clicked_at" timestamptz
);

create table if not exists public."homepage_hero_banners" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "subtitle" text,
  "image_url" text,
  "button_text" text,
  "button_url" text,
  "banner_type" text default 'marketing'::text,
  "active" boolean default true,
  "start_date" date,
  "end_date" date,
  "display_order" integer default 0,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."homepage_settings" (
  "section_key" text not null,
  "display_order" integer,
  "enabled" boolean default true,
  "title" text,
  "subtitle" text,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."homepage_sponsors" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "website" text,
  "logo_url" text,
  "display_order" integer default 0,
  "active" boolean default true,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "tier" text
);

create table if not exists public."homepage_testimonials" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "title" text,
  "quote" text not null,
  "image_url" text,
  "display_order" integer default 1,
  "active" boolean default true,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."influencer_profiles" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "email" text not null,
  "full_name" text not null,
  "city" text,
  "bio" text,
  "instagram_url" text,
  "tiktok_url" text,
  "youtube_url" text,
  "website_url" text,
  "photo_url" text,
  "niche" text,
  "follower_count" text,
  "public_listing" boolean default false,
  "status" text default 'pending'::text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "approved_by" text,
  "approved_at" timestamptz
);

create table if not exists public."local_businesses" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "address" text not null,
  "website" text,
  "category" text,
  "discount" text,
  "offer" text,
  "poc_name" text,
  "poc_email" text,
  "poc_phone" text,
  "image" text,
  "created_by" uuid,
  "created_at" timestamptz default now(),
  "image_urls" text[] default '{}'::text[],
  "approved" boolean default false,
  "status" text default 'pending'::text,
  "approved_by" text,
  "approved_at" timestamptz
);

create table if not exists public."newsletter_campaigns" (
  "id" uuid default gen_random_uuid() not null,
  "subject" text not null,
  "preheader" text,
  "status" text default 'draft'::text not null,
  "draft_json" jsonb default '{}'::jsonb not null,
  "created_by" uuid,
  "created_by_email" text,
  "test_sent_to" text,
  "test_sent_at" timestamptz,
  "sent_at" timestamptz,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."newsletter_settings" (
  "section_key" text not null,
  "display_order" integer default 1 not null,
  "enabled" boolean default true not null,
  "title" text,
  "max_items" integer default 4 not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."newsletter_subscribers" (
  "id" uuid default gen_random_uuid() not null,
  "email" text not null,
  "name" text,
  "status" text default 'active'::text not null,
  "verified" boolean default false not null,
  "source_page" text,
  "unsubscribe_token" text default (replace((gen_random_uuid())::text, '-'::text, ''::text) || replace((gen_random_uuid())::text, '-'::text, ''::text)) not null,
  "notes" text,
  "subscribed_at" timestamptz default now() not null,
  "confirmed_at" timestamptz,
  "unsubscribed_at" timestamptz,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."notifications" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "title" text,
  "message" text,
  "link" text,
  "read" boolean default false,
  "created_at" timestamptz default now()
);

create table if not exists public."public_content_requests" (
  "id" uuid default gen_random_uuid() not null,
  "submitter_name" text not null,
  "submitter_email" text not null,
  "submitter_phone" text,
  "title" text not null,
  "content_text" text,
  "image_url" text,
  "video_url" text,
  "source_url" text,
  "requested_channels" text[] default '{}'::text[],
  "status" text default 'new'::text not null,
  "assigned_editor_email" text,
  "admin_notes" text,
  "editor_notes" text,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null,
  "assigned_at" timestamptz,
  "published_at" timestamptz,
  "final_youtube_url" text,
  "final_instagram_url" text,
  "final_facebook_url" text,
  "final_website_url" text,
  "final_thumbnail_url" text,
  "review_requested_at" timestamptz,
  "approved_at" timestamptz,
  "submitter_user_id" uuid,
  "submitter_city" text,
  "submitter_profile_notes" text
);

create table if not exists public."public_visibility_controls" (
  "email" text not null,
  "user_id" uuid,
  "public_visibility_disabled" boolean default false not null,
  "reason" text,
  "disabled_at" timestamptz,
  "disabled_by" text,
  "updated_at" timestamptz default now()
);

create table if not exists public."radio_team_members" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "title" text not null,
  "segment_name" text not null,
  "image" text,
  "created_by" uuid,
  "created_at" timestamptz default now(),
  "user_id" uuid,
  "email" text,
  "show_on_public_radio" boolean default true not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists public."social_media_stats" (
  "platform" text not null,
  "followers" bigint,
  "views" bigint,
  "videos" bigint,
  "updated_at" timestamptz default now(),
  "href" text
);

create table if not exists public."sponsors" (
  "id" uuid default gen_random_uuid() not null,
  "name" text,
  "logo" text,
  "website" text,
  "tier" text,
  "active" boolean default true,
  "created_at" timestamptz default now()
);

create table if not exists public."team_members" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "title" text not null,
  "image" text,
  "created_by" uuid,
  "created_at" timestamptz default now(),
  "user_id" uuid,
  "email" text,
  "show_on_public_team" boolean default true not null,
  "updated_at" timestamptz default now() not null,
  "photo" text,
  "picture" text
);

create table if not exists public."user_profiles" (
  "user_id" uuid not null,
  "email" text,
  "full_name" text,
  "profile_photo_url" text,
  "role" text default 'general_public'::text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "preferred_name" text,
  "phone" text,
  "city" text,
  "state" text,
  "country" text,
  "short_bio" text,
  "instagram_url" text,
  "facebook_url" text,
  "linkedin_url" text,
  "website_url" text,
  "youtube_url" text,
  "interests" text[] default '{}'::text[],
  "show_name_publicly" boolean default false
);

create table if not exists public."user_role_requests" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "email" text not null,
  "requested_role" text default 'general_public'::text not null,
  "status" text default 'pending'::text not null,
  "approved_role" text,
  "approved_by" text,
  "approved_at" timestamptz,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."volunteer_onboarding_submissions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "email" text not null,
  "volunteer_request_id" uuid,
  "full_name" text not null,
  "phone" text not null,
  "city" text,
  "interests" text,
  "availability" text,
  "experience" text,
  "photo_url" text,
  "emergency_contact" text,
  "emergency_phone" text,
  "agreement_acknowledged" boolean default false not null,
  "agreement_acknowledged_at" timestamptz,
  "status" text default 'submitted'::text not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null,
  "agreement_text" text
);



-- ============================================================
-- functions/functions.sql
-- ============================================================

-- Functions captured from production.

CREATE OR REPLACE FUNCTION public.is_sdtv_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
      and role in ('pm_admin', 'super_admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.mark_volunteer_onboarding_submitted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.user_role_requests
  set status = 'awaiting_team_role_access'
  where id = new.volunteer_request_id
    and requested_role = 'volunteer'
    and status = 'awaiting_onboarding';

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;



-- ============================================================
-- schema/constraints.sql
-- ============================================================

-- Constraints captured from production.
-- Idempotent wrappers prevent duplicate constraint errors.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admins_user_id_fkey') then
    alter table public."admins" add constraint "admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admins_pkey') then
    alter table public."admins" add constraint "admins_pkey" PRIMARY KEY (user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admins_email_key') then
    alter table public."admins" add constraint "admins_email_key" UNIQUE (email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_groups_status_check') then
    alter table public."community_groups" add constraint "community_groups_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'on_hold'::text, 'rejected'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_groups_submitted_by_fkey') then
    alter table public."community_groups" add constraint "community_groups_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_groups_pkey') then
    alter table public."community_groups" add constraint "community_groups_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_organizations_status_check') then
    alter table public."community_organizations" add constraint "community_organizations_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'on_hold'::text, 'rejected'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_organizations_submitted_by_fkey') then
    alter table public."community_organizations" add constraint "community_organizations_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_organizations_pkey') then
    alter table public."community_organizations" add constraint "community_organizations_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contact_requests_pkey') then
    alter table public."contact_requests" add constraint "contact_requests_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crew_availability_pkey') then
    alter table public."crew_availability" add constraint "crew_availability_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crew_availability_user_id_available_date_key') then
    alter table public."crew_availability" add constraint "crew_availability_user_id_available_date_key" UNIQUE (user_id, available_date);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_coverage_sources_source_type_check') then
    alter table public."event_coverage_sources" add constraint "event_coverage_sources_source_type_check" CHECK (source_type = ANY (ARRAY['crew'::text, 'influencer'::text, 'organizer_media'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_coverage_sources_status_check') then
    alter table public."event_coverage_sources" add constraint "event_coverage_sources_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'requested'::text, 'available'::text, 'assigned_to_editor'::text, 'editing'::text, 'published'::text, 'not_available'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_coverage_sources_event_id_fkey') then
    alter table public."event_coverage_sources" add constraint "event_coverage_sources_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_coverage_sources_pkey') then
    alter table public."event_coverage_sources" add constraint "event_coverage_sources_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_crew_assignments_event_id_fkey') then
    alter table public."event_crew_assignments" add constraint "event_crew_assignments_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_crew_assignments_user_id_fkey') then
    alter table public."event_crew_assignments" add constraint "event_crew_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_crew_assignments_pkey') then
    alter table public."event_crew_assignments" add constraint "event_crew_assignments_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_crew_assignments_event_id_user_id_key') then
    alter table public."event_crew_assignments" add constraint "event_crew_assignments_event_id_user_id_key" UNIQUE (event_id, user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_crew_media_submissions_assignment_id_fkey') then
    alter table public."event_crew_media_submissions" add constraint "event_crew_media_submissions_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES event_crew_assignments(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_crew_media_submissions_event_id_fkey') then
    alter table public."event_crew_media_submissions" add constraint "event_crew_media_submissions_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_crew_media_submissions_pkey') then
    alter table public."event_crew_media_submissions" add constraint "event_crew_media_submissions_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_deliverables_completed_by_fkey') then
    alter table public."event_deliverables" add constraint "event_deliverables_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_deliverables_event_id_fkey') then
    alter table public."event_deliverables" add constraint "event_deliverables_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_deliverables_pkey') then
    alter table public."event_deliverables" add constraint "event_deliverables_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_deliverables_event_type_unique') then
    alter table public."event_deliverables" add constraint "event_deliverables_event_type_unique" UNIQUE (event_id, deliverable_type);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_influencer_intents_status_check') then
    alter table public."event_influencer_intents" add constraint "event_influencer_intents_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_influencer_intents_event_id_fkey') then
    alter table public."event_influencer_intents" add constraint "event_influencer_intents_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_influencer_intents_influencer_profile_id_fkey') then
    alter table public."event_influencer_intents" add constraint "event_influencer_intents_influencer_profile_id_fkey" FOREIGN KEY (influencer_profile_id) REFERENCES influencer_profiles(id) ON DELETE SET NULL;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_influencer_intents_pkey') then
    alter table public."event_influencer_intents" add constraint "event_influencer_intents_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_influencer_intents_event_id_user_email_key') then
    alter table public."event_influencer_intents" add constraint "event_influencer_intents_event_id_user_email_key" UNIQUE (event_id, user_email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_notifications_recipient_user_id_fkey') then
    alter table public."event_video_notifications" add constraint "event_video_notifications_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_notifications_workflow_id_fkey') then
    alter table public."event_video_notifications" add constraint "event_video_notifications_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES event_video_workflows(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_notifications_pkey') then
    alter table public."event_video_notifications" add constraint "event_video_notifications_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_revisions_submitted_by_fkey') then
    alter table public."event_video_revisions" add constraint "event_video_revisions_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_revisions_workflow_id_fkey') then
    alter table public."event_video_revisions" add constraint "event_video_revisions_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES event_video_workflows(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_revisions_pkey') then
    alter table public."event_video_revisions" add constraint "event_video_revisions_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_workflows_status_check') then
    alter table public."event_video_workflows" add constraint "event_video_workflows_status_check" CHECK (status = ANY (ARRAY['ready_for_editing'::text, 'in_editing'::text, 'awaiting_crew_review'::text, 'changes_requested'::text, 'crew_approved'::text, 'awaiting_admin_approval'::text, 'approved_for_publishing'::text, 'published_complete'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_workflows_created_by_fkey') then
    alter table public."event_video_workflows" add constraint "event_video_workflows_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_workflows_event_id_fkey') then
    alter table public."event_video_workflows" add constraint "event_video_workflows_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_workflows_updated_by_fkey') then
    alter table public."event_video_workflows" add constraint "event_video_workflows_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_workflows_pkey') then
    alter table public."event_video_workflows" add constraint "event_video_workflows_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_video_workflows_event_unique') then
    alter table public."event_video_workflows" add constraint "event_video_workflows_event_unique" UNIQUE (event_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_created_by_fkey') then
    alter table public."events" add constraint "events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_pkey') then
    alter table public."events" add constraint "events_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'featured_social_content_pkey') then
    alter table public."featured_social_content" add constraint "featured_social_content_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'festival_hero_assets_pkey') then
    alter table public."festival_hero_assets" add constraint "festival_hero_assets_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hero_analytics_pkey') then
    alter table public."hero_analytics" add constraint "hero_analytics_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_hero_banners_pkey') then
    alter table public."homepage_hero_banners" add constraint "homepage_hero_banners_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_settings_section_key_check') then
    alter table public."homepage_settings" add constraint "homepage_settings_section_key_check" CHECK (section_key = ANY (ARRAY['home'::text, 'stats'::text, 'events'::text, 'businesses'::text, 'radio'::text, 'videos'::text, 'featured_social'::text, 'testimonials'::text, 'social'::text, 'team'::text, 'sponsors'::text, 'contact'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_settings_pkey') then
    alter table public."homepage_settings" add constraint "homepage_settings_pkey" PRIMARY KEY (section_key);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_sponsors_pkey') then
    alter table public."homepage_sponsors" add constraint "homepage_sponsors_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_testimonials_pkey') then
    alter table public."homepage_testimonials" add constraint "homepage_testimonials_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'influencer_profiles_status_check') then
    alter table public."influencer_profiles" add constraint "influencer_profiles_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'hidden'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'influencer_profiles_pkey') then
    alter table public."influencer_profiles" add constraint "influencer_profiles_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'influencer_profiles_email_key') then
    alter table public."influencer_profiles" add constraint "influencer_profiles_email_key" UNIQUE (email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'local_businesses_created_by_fkey') then
    alter table public."local_businesses" add constraint "local_businesses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'local_businesses_pkey') then
    alter table public."local_businesses" add constraint "local_businesses_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'newsletter_campaigns_status_check') then
    alter table public."newsletter_campaigns" add constraint "newsletter_campaigns_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'test_sent'::text, 'sent'::text, 'archived'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'newsletter_campaigns_pkey') then
    alter table public."newsletter_campaigns" add constraint "newsletter_campaigns_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'newsletter_settings_pkey') then
    alter table public."newsletter_settings" add constraint "newsletter_settings_pkey" PRIMARY KEY (section_key);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'newsletter_subscribers_status_check') then
    alter table public."newsletter_subscribers" add constraint "newsletter_subscribers_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'unsubscribed'::text, 'bounced'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'newsletter_subscribers_pkey') then
    alter table public."newsletter_subscribers" add constraint "newsletter_subscribers_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'newsletter_subscribers_email_key') then
    alter table public."newsletter_subscribers" add constraint "newsletter_subscribers_email_key" UNIQUE (email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'notifications_pkey') then
    alter table public."notifications" add constraint "notifications_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'public_content_requests_status_check') then
    alter table public."public_content_requests" add constraint "public_content_requests_status_check" CHECK (status = ANY (ARRAY['new'::text, 'reviewing'::text, 'assigned_to_editor'::text, 'in_editing'::text, 'review_requested'::text, 'changes_requested'::text, 'approved_for_publishing'::text, 'published'::text, 'rejected'::text, 'closed'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'public_content_requests_pkey') then
    alter table public."public_content_requests" add constraint "public_content_requests_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'public_visibility_controls_pkey') then
    alter table public."public_visibility_controls" add constraint "public_visibility_controls_pkey" PRIMARY KEY (email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'radio_team_members_created_by_fkey') then
    alter table public."radio_team_members" add constraint "radio_team_members_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'radio_team_members_pkey') then
    alter table public."radio_team_members" add constraint "radio_team_members_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'social_media_stats_pkey') then
    alter table public."social_media_stats" add constraint "social_media_stats_pkey" PRIMARY KEY (platform);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sponsors_pkey') then
    alter table public."sponsors" add constraint "sponsors_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'team_members_created_by_fkey') then
    alter table public."team_members" add constraint "team_members_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'team_members_pkey') then
    alter table public."team_members" add constraint "team_members_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_pkey') then
    alter table public."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY (user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_email_key') then
    alter table public."user_profiles" add constraint "user_profiles_email_key" UNIQUE (email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_role_requests_status_check') then
    alter table public."user_role_requests" add constraint "user_role_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'awaiting_orientation'::text, 'awaiting_onboarding'::text, 'awaiting_team_role_access'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_role_requests_pkey') then
    alter table public."user_role_requests" add constraint "user_role_requests_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'volunteer_onboarding_submissions_pkey') then
    alter table public."volunteer_onboarding_submissions" add constraint "volunteer_onboarding_submissions_pkey" PRIMARY KEY (id);
  end if;
end $$;



-- ============================================================
-- schema/indexes.sql
-- ============================================================

-- Indexes captured from production.
-- CREATE INDEX IF NOT EXISTS is used for idempotency.

CREATE UNIQUE INDEX IF NOT EXISTS admins_email_key ON public.admins USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS admins_pkey ON public.admins USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS community_groups_pkey ON public.community_groups USING btree (id);
CREATE INDEX IF NOT EXISTS community_groups_status_created_idx ON public.community_groups USING btree (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS community_organizations_pkey ON public.community_organizations USING btree (id);
CREATE INDEX IF NOT EXISTS community_orgs_status_created_idx ON public.community_organizations USING btree (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_pkey ON public.contact_requests USING btree (id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created ON public.contact_requests USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS crew_availability_pkey ON public.crew_availability USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS crew_availability_user_id_available_date_key ON public.crew_availability USING btree (user_id, available_date);
CREATE INDEX IF NOT EXISTS event_coverage_sources_event_id_idx ON public.event_coverage_sources USING btree (event_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_coverage_sources_pkey ON public.event_coverage_sources USING btree (id);
CREATE INDEX IF NOT EXISTS event_coverage_sources_status_idx ON public.event_coverage_sources USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS event_crew_assignments_event_id_user_id_key ON public.event_crew_assignments USING btree (event_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_crew_assignments_pkey ON public.event_crew_assignments USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS event_crew_media_submissions_assignment_unique ON public.event_crew_media_submissions USING btree (assignment_id) WHERE (assignment_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS event_crew_media_submissions_event_id_idx ON public.event_crew_media_submissions USING btree (event_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_crew_media_submissions_pkey ON public.event_crew_media_submissions USING btree (id);
CREATE INDEX IF NOT EXISTS event_deliverables_completed_idx ON public.event_deliverables USING btree (event_id, completed);
CREATE INDEX IF NOT EXISTS event_deliverables_event_id_idx ON public.event_deliverables USING btree (event_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_deliverables_event_type_unique ON public.event_deliverables USING btree (event_id, deliverable_type);
CREATE UNIQUE INDEX IF NOT EXISTS event_deliverables_pkey ON public.event_deliverables USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS event_influencer_intents_event_id_user_email_key ON public.event_influencer_intents USING btree (event_id, user_email);
CREATE UNIQUE INDEX IF NOT EXISTS event_influencer_intents_pkey ON public.event_influencer_intents USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS event_video_notifications_pkey ON public.event_video_notifications USING btree (id);
CREATE INDEX IF NOT EXISTS event_video_notifications_recipient_idx ON public.event_video_notifications USING btree (recipient_user_id, is_read);
CREATE UNIQUE INDEX IF NOT EXISTS event_video_revisions_pkey ON public.event_video_revisions USING btree (id);
CREATE INDEX IF NOT EXISTS event_video_revisions_workflow_idx ON public.event_video_revisions USING btree (workflow_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS event_video_workflows_crew_idx ON public.event_video_workflows USING btree (lower(crew_reviewer_email));
CREATE INDEX IF NOT EXISTS event_video_workflows_editor_idx ON public.event_video_workflows USING btree (lower(assigned_editor_email));
CREATE INDEX IF NOT EXISTS event_video_workflows_event_id_idx ON public.event_video_workflows USING btree (event_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_video_workflows_event_unique ON public.event_video_workflows USING btree (event_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_video_workflows_pkey ON public.event_video_workflows USING btree (id);
CREATE INDEX IF NOT EXISTS event_video_workflows_status_idx ON public.event_video_workflows USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS events_pkey ON public.events USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS featured_social_content_pkey ON public.featured_social_content USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS festival_hero_assets_pkey ON public.festival_hero_assets USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS hero_analytics_pkey ON public.hero_analytics USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS homepage_hero_banners_pkey ON public.homepage_hero_banners USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS homepage_settings_pkey ON public.homepage_settings USING btree (section_key);
CREATE UNIQUE INDEX IF NOT EXISTS homepage_sponsors_pkey ON public.homepage_sponsors USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS homepage_testimonials_pkey ON public.homepage_testimonials USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS influencer_profiles_email_key ON public.influencer_profiles USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS influencer_profiles_pkey ON public.influencer_profiles USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS local_businesses_pkey ON public.local_businesses USING btree (id);
CREATE INDEX IF NOT EXISTS newsletter_campaigns_created_at_idx ON public.newsletter_campaigns USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_campaigns_pkey ON public.newsletter_campaigns USING btree (id);
CREATE INDEX IF NOT EXISTS newsletter_campaigns_status_idx ON public.newsletter_campaigns USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_settings_pkey ON public.newsletter_settings USING btree (section_key);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key ON public.newsletter_subscribers USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_pkey ON public.newsletter_subscribers USING btree (id);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx ON public.newsletter_subscribers USING btree (status);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_subscribed_at_idx ON public.newsletter_subscribers USING btree (subscribed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_pkey ON public.notifications USING btree (id);
CREATE INDEX IF NOT EXISTS public_content_requests_created_at_idx ON public.public_content_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS public_content_requests_editor_idx ON public.public_content_requests USING btree (assigned_editor_email);
CREATE UNIQUE INDEX IF NOT EXISTS public_content_requests_pkey ON public.public_content_requests USING btree (id);
CREATE INDEX IF NOT EXISTS public_content_requests_status_idx ON public.public_content_requests USING btree (status);
CREATE INDEX IF NOT EXISTS public_content_requests_submitter_idx ON public.public_content_requests USING btree (submitter_user_id);
CREATE INDEX IF NOT EXISTS public_visibility_controls_disabled_idx ON public.public_visibility_controls USING btree (public_visibility_disabled);
CREATE UNIQUE INDEX IF NOT EXISTS public_visibility_controls_pkey ON public.public_visibility_controls USING btree (email);
CREATE INDEX IF NOT EXISTS public_visibility_controls_user_id_idx ON public.public_visibility_controls USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS radio_team_members_pkey ON public.radio_team_members USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS radio_team_members_user_id_unique ON public.radio_team_members USING btree (user_id) WHERE (user_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS social_media_stats_pkey ON public.social_media_stats USING btree (platform);
CREATE UNIQUE INDEX IF NOT EXISTS sponsors_pkey ON public.sponsors USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS team_members_pkey ON public.team_members USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_id_unique ON public.team_members USING btree (user_id) WHERE (user_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON public.user_profiles USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_key ON public.user_profiles USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_pkey ON public.user_profiles USING btree (user_id);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles USING btree (role);
CREATE INDEX IF NOT EXISTS user_profiles_visibility_idx ON public.user_profiles USING btree (public_visibility_disabled);
CREATE UNIQUE INDEX IF NOT EXISTS user_role_requests_pkey ON public.user_role_requests USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS volunteer_onboarding_submissions_pkey ON public.volunteer_onboarding_submissions USING btree (id);


-- ============================================================
-- security/rls.sql
-- ============================================================

-- RLS status captured from production.

alter table if exists public."admins" enable row level security;
alter table if exists public."community_groups" enable row level security;
alter table if exists public."community_organizations" enable row level security;
alter table if exists public."contact_requests" enable row level security;
alter table if exists public."crew_availability" enable row level security;
alter table if exists public."event_coverage_sources" enable row level security;
alter table if exists public."event_crew_assignments" enable row level security;
alter table if exists public."event_crew_media_submissions" enable row level security;
alter table if exists public."event_deliverables" enable row level security;
alter table if exists public."event_influencer_intents" enable row level security;
alter table if exists public."event_video_notifications" enable row level security;
alter table if exists public."event_video_revisions" enable row level security;
alter table if exists public."event_video_workflows" enable row level security;
alter table if exists public."events" enable row level security;
alter table if exists public."featured_social_content" enable row level security;
alter table if exists public."festival_hero_assets" enable row level security;
alter table if exists public."hero_analytics" enable row level security;
alter table if exists public."homepage_hero_banners" enable row level security;
alter table if exists public."homepage_settings" enable row level security;
alter table if exists public."homepage_sponsors" enable row level security;
alter table if exists public."homepage_testimonials" enable row level security;
alter table if exists public."influencer_profiles" enable row level security;
alter table if exists public."local_businesses" enable row level security;
alter table if exists public."newsletter_campaigns" enable row level security;
alter table if exists public."newsletter_settings" enable row level security;
alter table if exists public."newsletter_subscribers" enable row level security;
alter table if exists public."notifications" disable row level security;
alter table if exists public."public_content_requests" enable row level security;
alter table if exists public."public_visibility_controls" enable row level security;
alter table if exists public."radio_team_members" enable row level security;
alter table if exists public."social_media_stats" enable row level security;
alter table if exists public."sponsors" disable row level security;
alter table if exists public."team_members" enable row level security;
alter table if exists public."user_profiles" enable row level security;
alter table if exists public."user_role_requests" enable row level security;
alter table if exists public."volunteer_onboarding_submissions" enable row level security;



-- ============================================================
-- security/policies.sql
-- ============================================================

-- Public schema RLS policies captured from production.
-- Run after tables and RLS status are in place.

drop policy if exists "admins_manage_by_admin" on public."admins";
create policy "admins_manage_by_admin"
on public."admins"
for all
to authenticated
using (is_sdtv_admin())
with check (is_sdtv_admin());

drop policy if exists "admins_select_own" on public."admins";
create policy "admins_select_own"
on public."admins"
for select
to authenticated
using (((user_id = auth.uid()) OR (lower(email) = lower((auth.jwt() ->> 'email'::text))) OR is_sdtv_admin()));

drop policy if exists "Admins manage community groups" on public."community_groups";
create policy "Admins manage community groups"
on public."community_groups"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Community groups approved public read" on public."community_groups";
create policy "Community groups approved public read"
on public."community_groups"
for select
to public
using (((status = 'approved'::text) AND (approved = true)));

drop policy if exists "Logged in users submit community groups" on public."community_groups";
create policy "Logged in users submit community groups"
on public."community_groups"
for insert
to authenticated
with check (((auth.uid() = submitted_by) AND (status = 'pending'::text) AND (approved = false)));

drop policy if exists "Submitters read own community groups" on public."community_groups";
create policy "Submitters read own community groups"
on public."community_groups"
for select
to authenticated
using ((auth.uid() = submitted_by));

drop policy if exists "Admins manage community orgs" on public."community_organizations";
create policy "Admins manage community orgs"
on public."community_organizations"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Community orgs approved public read" on public."community_organizations";
create policy "Community orgs approved public read"
on public."community_organizations"
for select
to public
using (((status = 'approved'::text) AND (approved = true)));

drop policy if exists "Logged in users submit community orgs" on public."community_organizations";
create policy "Logged in users submit community orgs"
on public."community_organizations"
for insert
to authenticated
with check (((auth.uid() = submitted_by) AND (status = 'pending'::text) AND (approved = false)));

drop policy if exists "Submitters read own community orgs" on public."community_organizations";
create policy "Submitters read own community orgs"
on public."community_organizations"
for select
to authenticated
using ((auth.uid() = submitted_by));

drop policy if exists "Admins can read contact requests" on public."contact_requests";
create policy "Admins can read contact requests"
on public."contact_requests"
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Admins can update contact requests" on public."contact_requests";
create policy "Admins can update contact requests"
on public."contact_requests"
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Anyone can submit contact requests" on public."contact_requests";
create policy "Anyone can submit contact requests"
on public."contact_requests"
for insert
to public
with check (true);

drop policy if exists "Users can manage own availability" on public."crew_availability";
create policy "Users can manage own availability"
on public."crew_availability"
for all
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));

drop policy if exists "Users can view own availability" on public."crew_availability";
create policy "Users can view own availability"
on public."crew_availability"
for select
to public
using ((user_id = auth.uid()));

drop policy if exists "Admins can manage coverage sources" on public."event_coverage_sources";
create policy "Admins can manage coverage sources"
on public."event_coverage_sources"
for all
to public
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (a.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text, 'admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (a.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text, 'admin'::text]))))));

drop policy if exists "Organizers can submit event media sources" on public."event_coverage_sources";
create policy "Organizers can submit event media sources"
on public."event_coverage_sources"
for insert
to public
with check (((source_type = 'organizer_media'::text) AND (status = ANY (ARRAY['available'::text, 'requested'::text]))));

drop policy if exists "Admins and team can create crew assignments" on public."event_crew_assignments";
create policy "Admins and team can create crew assignments"
on public."event_crew_assignments"
for insert
to authenticated
with check ((auth.uid() IS NOT NULL));

drop policy if exists "Admins can update event crew assignments" on public."event_crew_assignments";
create policy "Admins can update event crew assignments"
on public."event_crew_assignments"
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (lower(admins.role) ~~ '%admin%'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (lower(admins.role) ~~ '%admin%'::text)))));

drop policy if exists "Anyone can view event crew" on public."event_crew_assignments";
create policy "Anyone can view event crew"
on public."event_crew_assignments"
for select
to public
using (true);

drop policy if exists "Crew can join events" on public."event_crew_assignments";
create policy "Crew can join events"
on public."event_crew_assignments"
for insert
to authenticated
with check ((user_id = auth.uid()));

drop policy if exists "Crew can update own approved assignments" on public."event_crew_assignments";
create policy "Crew can update own approved assignments"
on public."event_crew_assignments"
for update
to authenticated
using (((status = 'approved'::text) AND ((user_id = auth.uid()) OR (lower(COALESCE(user_email, ''::text)) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))))))
with check (((status = 'approved'::text) AND ((user_id = auth.uid()) OR (lower(COALESCE(user_email, ''::text)) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))))));

drop policy if exists "Crew users can join event crew" on public."event_crew_assignments";
create policy "Crew users can join event crew"
on public."event_crew_assignments"
for insert
to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%crew%'::text))))));

drop policy if exists "Users can view event crew assignments" on public."event_crew_assignments";
create policy "Users can view event crew assignments"
on public."event_crew_assignments"
for select
to authenticated
using (true);

drop policy if exists "crew media submissions insert own" on public."event_crew_media_submissions";
create policy "crew media submissions insert own"
on public."event_crew_media_submissions"
for insert
to public
with check (((auth.uid() = user_id) OR (user_id IS NULL)));

drop policy if exists "crew media submissions read" on public."event_crew_media_submissions";
create policy "crew media submissions read"
on public."event_crew_media_submissions"
for select
to public
using (true);

drop policy if exists "crew media submissions update own" on public."event_crew_media_submissions";
create policy "crew media submissions update own"
on public."event_crew_media_submissions"
for update
to public
using (((auth.uid() = user_id) OR (user_id IS NULL)))
with check (((auth.uid() = user_id) OR (user_id IS NULL)));

drop policy if exists "Event deliverables insertable by authenticated users" on public."event_deliverables";
create policy "Event deliverables insertable by authenticated users"
on public."event_deliverables"
for insert
to authenticated
with check ((auth.uid() IS NOT NULL));

drop policy if exists "Event deliverables readable by authenticated users" on public."event_deliverables";
create policy "Event deliverables readable by authenticated users"
on public."event_deliverables"
for select
to authenticated
using (true);

drop policy if exists "Event deliverables updatable by authenticated users" on public."event_deliverables";
create policy "Event deliverables updatable by authenticated users"
on public."event_deliverables"
for update
to authenticated
using ((auth.uid() IS NOT NULL))
with check ((auth.uid() IS NOT NULL));

drop policy if exists "Admins can manage influencer intents" on public."event_influencer_intents";
create policy "Admins can manage influencer intents"
on public."event_influencer_intents"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) OR (lower(a.email) = lower((auth.jwt() ->> 'email'::text)))))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) OR (lower(a.email) = lower((auth.jwt() ->> 'email'::text)))))));

drop policy if exists "Users can create own influencer intents" on public."event_influencer_intents";
create policy "Users can create own influencer intents"
on public."event_influencer_intents"
for insert
to authenticated
with check (((auth.uid() = user_id) OR (lower(user_email) = lower((auth.jwt() ->> 'email'::text)))));

drop policy if exists "Users can view own influencer intents" on public."event_influencer_intents";
create policy "Users can view own influencer intents"
on public."event_influencer_intents"
for select
to authenticated
using (((auth.uid() = user_id) OR (lower(user_email) = lower((auth.jwt() ->> 'email'::text)))));

drop policy if exists "Video notifications insertable by authenticated users" on public."event_video_notifications";
create policy "Video notifications insertable by authenticated users"
on public."event_video_notifications"
for insert
to authenticated
with check ((auth.uid() IS NOT NULL));

drop policy if exists "Video notifications readable by recipient" on public."event_video_notifications";
create policy "Video notifications readable by recipient"
on public."event_video_notifications"
for select
to authenticated
using (((recipient_user_id = auth.uid()) OR (recipient_user_id IS NULL)));

drop policy if exists "Video notifications updatable by recipient" on public."event_video_notifications";
create policy "Video notifications updatable by recipient"
on public."event_video_notifications"
for update
to authenticated
using (((recipient_user_id = auth.uid()) OR (recipient_user_id IS NULL)))
with check (((recipient_user_id = auth.uid()) OR (recipient_user_id IS NULL)));

drop policy if exists "Video revisions insertable by authenticated users" on public."event_video_revisions";
create policy "Video revisions insertable by authenticated users"
on public."event_video_revisions"
for insert
to authenticated
with check ((auth.uid() IS NOT NULL));

drop policy if exists "Video revisions readable by authenticated users" on public."event_video_revisions";
create policy "Video revisions readable by authenticated users"
on public."event_video_revisions"
for select
to authenticated
using (true);

drop policy if exists "Video workflows insertable by authenticated users" on public."event_video_workflows";
create policy "Video workflows insertable by authenticated users"
on public."event_video_workflows"
for insert
to authenticated
with check ((auth.uid() IS NOT NULL));

drop policy if exists "Video workflows readable by authenticated users" on public."event_video_workflows";
create policy "Video workflows readable by authenticated users"
on public."event_video_workflows"
for select
to authenticated
using (true);

drop policy if exists "Video workflows updatable by authenticated users" on public."event_video_workflows";
create policy "Video workflows updatable by authenticated users"
on public."event_video_workflows"
for update
to authenticated
using ((auth.uid() IS NOT NULL))
with check ((auth.uid() IS NOT NULL));

drop policy if exists "Admins can delete events" on public."events";
create policy "Admins can delete events"
on public."events"
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (lower(admins.role) ~~ '%admin%'::text)))));

drop policy if exists "Admins can update events" on public."events";
create policy "Admins can update events"
on public."events"
for update
to authenticated
using (((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (lower(admins.role) ~~ '%admin%'::text))))))
with check (true);

drop policy if exists "Anyone can view events" on public."events";
create policy "Anyone can view events"
on public."events"
for select
to public
using (true);

drop policy if exists "Logged in users can create events" on public."events";
create policy "Logged in users can create events"
on public."events"
for insert
to authenticated
with check ((auth.uid() = created_by));

drop policy if exists "featured_social_admin_all" on public."featured_social_content";
create policy "featured_social_admin_all"
on public."featured_social_content"
for all
to public
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (lower(admins.email) = lower((auth.jwt() ->> 'email'::text))))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE (lower(admins.email) = lower((auth.jwt() ->> 'email'::text))))));

drop policy if exists "featured_social_public_read" on public."featured_social_content";
create policy "featured_social_public_read"
on public."featured_social_content"
for select
to public
using ((active = true));

drop policy if exists "festival_hero_assets_admin_manage" on public."festival_hero_assets";
create policy "festival_hero_assets_admin_manage"
on public."festival_hero_assets"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (admins.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (admins.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text]))))));

drop policy if exists "festival_hero_assets_public_read" on public."festival_hero_assets";
create policy "festival_hero_assets_public_read"
on public."festival_hero_assets"
for select
to public
using (true);

drop policy if exists "homepage_hero_banners_admin_manage" on public."homepage_hero_banners";
create policy "homepage_hero_banners_admin_manage"
on public."homepage_hero_banners"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (admins.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (admins.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text]))))));

drop policy if exists "homepage_hero_banners_public_read" on public."homepage_hero_banners";
create policy "homepage_hero_banners_public_read"
on public."homepage_hero_banners"
for select
to public
using (true);

drop policy if exists "homepage_settings_admin_manage" on public."homepage_settings";
create policy "homepage_settings_admin_manage"
on public."homepage_settings"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (admins.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (admins.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text]))))));

drop policy if exists "homepage_settings_public_read" on public."homepage_settings";
create policy "homepage_settings_public_read"
on public."homepage_settings"
for select
to public
using (true);

drop policy if exists "homepage_sponsors_admin_manage" on public."homepage_sponsors";
create policy "homepage_sponsors_admin_manage"
on public."homepage_sponsors"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (admins.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (admins.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text]))))));

drop policy if exists "homepage_sponsors_public_read" on public."homepage_sponsors";
create policy "homepage_sponsors_public_read"
on public."homepage_sponsors"
for select
to public
using (true);

drop policy if exists "homepage_testimonials_admin_all" on public."homepage_testimonials";
create policy "homepage_testimonials_admin_all"
on public."homepage_testimonials"
for all
to public
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (lower(admins.email) = lower((auth.jwt() ->> 'email'::text))))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE (lower(admins.email) = lower((auth.jwt() ->> 'email'::text))))));

drop policy if exists "homepage_testimonials_public_read" on public."homepage_testimonials";
create policy "homepage_testimonials_public_read"
on public."homepage_testimonials"
for select
to public
using ((active = true));

drop policy if exists "Admins can manage influencer profiles" on public."influencer_profiles";
create policy "Admins can manage influencer profiles"
on public."influencer_profiles"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) OR (lower(a.email) = lower((auth.jwt() ->> 'email'::text)))))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) OR (lower(a.email) = lower((auth.jwt() ->> 'email'::text)))))));

drop policy if exists "Public can view approved public influencers" on public."influencer_profiles";
create policy "Public can view approved public influencers"
on public."influencer_profiles"
for select
to anon, authenticated
using (((status = 'approved'::text) AND (public_listing = true)));

drop policy if exists "Users can upsert own influencer profile" on public."influencer_profiles";
create policy "Users can upsert own influencer profile"
on public."influencer_profiles"
for all
to authenticated
using (((auth.uid() = user_id) OR (lower(email) = lower((auth.jwt() ->> 'email'::text)))))
with check (((auth.uid() = user_id) OR (lower(email) = lower((auth.jwt() ->> 'email'::text)))));

drop policy if exists "Users can view own influencer profile" on public."influencer_profiles";
create policy "Users can view own influencer profile"
on public."influencer_profiles"
for select
to authenticated
using (((auth.uid() = user_id) OR (lower(email) = lower((auth.jwt() ->> 'email'::text)))));

drop policy if exists "Admins can delete businesses" on public."local_businesses";
create policy "Admins can delete businesses"
on public."local_businesses"
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (lower(admins.role) ~~ '%admin%'::text)))));

drop policy if exists "Admins can update businesses" on public."local_businesses";
create policy "Admins can update businesses"
on public."local_businesses"
for update
to authenticated
using (((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (lower(admins.role) ~~ '%admin%'::text))))))
with check (true);

drop policy if exists "Anyone can view local businesses" on public."local_businesses";
create policy "Anyone can view local businesses"
on public."local_businesses"
for select
to public
using (true);

drop policy if exists "Logged in users can create local businesses" on public."local_businesses";
create policy "Logged in users can create local businesses"
on public."local_businesses"
for insert
to authenticated
with check ((auth.uid() = created_by));

drop policy if exists "newsletter_campaigns_admin_delete" on public."newsletter_campaigns";
create policy "newsletter_campaigns_admin_delete"
on public."newsletter_campaigns"
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

drop policy if exists "newsletter_campaigns_admin_insert" on public."newsletter_campaigns";
create policy "newsletter_campaigns_admin_insert"
on public."newsletter_campaigns"
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

drop policy if exists "newsletter_campaigns_admin_select" on public."newsletter_campaigns";
create policy "newsletter_campaigns_admin_select"
on public."newsletter_campaigns"
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

drop policy if exists "newsletter_campaigns_admin_update" on public."newsletter_campaigns";
create policy "newsletter_campaigns_admin_update"
on public."newsletter_campaigns"
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

drop policy if exists "newsletter_subscribers_public_insert" on public."newsletter_subscribers";
create policy "newsletter_subscribers_public_insert"
on public."newsletter_subscribers"
for insert
to anon, authenticated
with check (true);

drop policy if exists "newsletter_subscribers_public_select" on public."newsletter_subscribers";
create policy "newsletter_subscribers_public_select"
on public."newsletter_subscribers"
for select
to anon, authenticated
using (true);

drop policy if exists "newsletter_subscribers_public_update" on public."newsletter_subscribers";
create policy "newsletter_subscribers_public_update"
on public."newsletter_subscribers"
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Admins can manage public content requests" on public."public_content_requests";
create policy "Admins can manage public content requests"
on public."public_content_requests"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Assigned editors can read public content requests" on public."public_content_requests";
create policy "Assigned editors can read public content requests"
on public."public_content_requests"
for select
to authenticated
using ((lower(assigned_editor_email) = lower((auth.jwt() ->> 'email'::text))));

drop policy if exists "Assigned editors can update public content requests" on public."public_content_requests";
create policy "Assigned editors can update public content requests"
on public."public_content_requests"
for update
to authenticated
using ((lower(assigned_editor_email) = lower((auth.jwt() ->> 'email'::text))))
with check ((lower(assigned_editor_email) = lower((auth.jwt() ->> 'email'::text))));

drop policy if exists "Authenticated users can submit public content requests" on public."public_content_requests";
create policy "Authenticated users can submit public content requests"
on public."public_content_requests"
for insert
to authenticated
with check ((auth.uid() = submitter_user_id));

drop policy if exists "Submitters can read their own public content requests" on public."public_content_requests";
create policy "Submitters can read their own public content requests"
on public."public_content_requests"
for select
to authenticated
using ((auth.uid() = submitter_user_id));

drop policy if exists "Admins can manage public visibility controls" on public."public_visibility_controls";
create policy "Admins can manage public visibility controls"
on public."public_visibility_controls"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Public can read disabled visibility controls" on public."public_visibility_controls";
create policy "Public can read disabled visibility controls"
on public."public_visibility_controls"
for select
to anon, authenticated
using ((public_visibility_disabled = true));

drop policy if exists "Admins can add radio team members" on public."radio_team_members";
create policy "Admins can add radio team members"
on public."radio_team_members"
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Admins can manage radio team profiles" on public."radio_team_members";
create policy "Admins can manage radio team profiles"
on public."radio_team_members"
for all
to public
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE (((a.user_id = auth.uid()) OR (lower(a.email) = lower((auth.jwt() ->> 'email'::text)))) AND (lower(a.role) ~~ '%admin%'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE (((a.user_id = auth.uid()) OR (lower(a.email) = lower((auth.jwt() ->> 'email'::text)))) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Anyone can view radio team members" on public."radio_team_members";
create policy "Anyone can view radio team members"
on public."radio_team_members"
for select
to public
using (true);

drop policy if exists "Public can read visible radio team profiles" on public."radio_team_members";
create policy "Public can read visible radio team profiles"
on public."radio_team_members"
for select
to public
using ((show_on_public_radio = true));

drop policy if exists "Users can update own radio profile" on public."radio_team_members";
create policy "Users can update own radio profile"
on public."radio_team_members"
for update
to authenticated
using (((auth.uid() = user_id) OR (lower(email) = lower((auth.jwt() ->> 'email'::text)))))
with check (((auth.uid() = user_id) OR (lower(email) = lower((auth.jwt() ->> 'email'::text)))));

drop policy if exists "social_media_stats_admin_manage" on public."social_media_stats";
create policy "social_media_stats_admin_manage"
on public."social_media_stats"
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (admins.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (admins.role = ANY (ARRAY['super_admin'::text, 'pm_admin'::text]))))));

drop policy if exists "social_media_stats_public_read" on public."social_media_stats";
create policy "social_media_stats_public_read"
on public."social_media_stats"
for select
to public
using (true);

drop policy if exists "Admins can add team members" on public."team_members";
create policy "Admins can add team members"
on public."team_members"
for insert
to authenticated
with check (((auth.jwt() ->> 'email'::text) = ANY (ARRAY['abharathkumar@gmail.com'::text, 'admin@seattledesitv.com'::text])));

drop policy if exists "Admins can insert team members" on public."team_members";
create policy "Admins can insert team members"
on public."team_members"
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE ((admins.user_id = auth.uid()) AND (lower(admins.role) ~~ '%admin%'::text)))));

drop policy if exists "Admins can manage team member profiles" on public."team_members";
create policy "Admins can manage team member profiles"
on public."team_members"
for all
to public
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE (((a.user_id = auth.uid()) OR (lower(a.email) = lower((auth.jwt() ->> 'email'::text)))) AND (lower(a.role) ~~ '%admin%'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE (((a.user_id = auth.uid()) OR (lower(a.email) = lower((auth.jwt() ->> 'email'::text)))) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Anyone can view team members" on public."team_members";
create policy "Anyone can view team members"
on public."team_members"
for select
to public
using (true);

drop policy if exists "Users can insert own team member profile" on public."team_members";
create policy "Users can insert own team member profile"
on public."team_members"
for insert
to public
with check ((auth.uid() = user_id));

drop policy if exists "Users can update own team member profile" on public."team_members";
create policy "Users can update own team member profile"
on public."team_members"
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));

drop policy if exists "Admins can insert user profiles" on public."user_profiles";
create policy "Admins can insert user profiles"
on public."user_profiles"
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Admins can read all profiles" on public."user_profiles";
create policy "Admins can read all profiles"
on public."user_profiles"
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Admins can update user profiles" on public."user_profiles";
create policy "Admins can update user profiles"
on public."user_profiles"
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Users can insert own profile" on public."user_profiles";
create policy "Users can insert own profile"
on public."user_profiles"
for insert
to authenticated
with check ((auth.uid() = user_id));

drop policy if exists "Users can read own profile" on public."user_profiles";
create policy "Users can read own profile"
on public."user_profiles"
for select
to authenticated
using ((auth.uid() = user_id));

drop policy if exists "Users can update own profile" on public."user_profiles";
create policy "Users can update own profile"
on public."user_profiles"
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));

drop policy if exists "Admins can update role requests" on public."user_role_requests";
create policy "Admins can update role requests"
on public."user_role_requests"
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));

drop policy if exists "Admins can view all role requests" on public."user_role_requests";
create policy "Admins can view all role requests"
on public."user_role_requests"
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE ((a.user_id = auth.uid()) AND (lower(a.role) ~~ '%admin%'::text)))));



-- ============================================================
-- functions/triggers.sql
-- ============================================================

-- Triggers captured from production.

drop trigger if exists featured_social_content_updated_at on public."featured_social_content";
create trigger featured_social_content_updated_at before update on public."featured_social_content" for each row execute function update_updated_at_column();

drop trigger if exists homepage_testimonials_updated_at on public."homepage_testimonials";
create trigger homepage_testimonials_updated_at before update on public."homepage_testimonials" for each row execute function update_updated_at_column();

drop trigger if exists radio_team_members_set_updated_at on public."radio_team_members";
create trigger radio_team_members_set_updated_at before update on public."radio_team_members" for each row execute function set_updated_at();

drop trigger if exists team_members_set_updated_at on public."team_members";
create trigger team_members_set_updated_at before update on public."team_members" for each row execute function set_updated_at();

drop trigger if exists user_role_requests_updated_at on public."user_role_requests";
create trigger user_role_requests_updated_at before update on public."user_role_requests" for each row execute function update_updated_at_column();

drop trigger if exists volunteer_onboarding_set_updated_at on public."volunteer_onboarding_submissions";
create trigger volunteer_onboarding_set_updated_at before update on public."volunteer_onboarding_submissions" for each row execute function set_updated_at();

drop trigger if exists volunteer_onboarding_submitted_status on public."volunteer_onboarding_submissions";
create trigger volunteer_onboarding_submitted_status after insert on public."volunteer_onboarding_submissions" for each row execute function mark_volunteer_onboarding_submitted();



-- ============================================================
-- storage/buckets.sql
-- ============================================================

-- Storage buckets captured from production.

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



-- ============================================================
-- storage/storage-policies.sql
-- ============================================================

-- Storage policies captured from production.

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



-- ============================================================
-- seed/sample-data.sql
-- ============================================================

-- Safe sample records for staging can be added here.
-- Do not add production secrets or private user data.


