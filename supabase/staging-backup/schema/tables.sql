-- Tables generated from the current columns export.
-- WARNING: This is PARTIAL. The export currently covers only these tables:
-- admins, community_groups, community_organizations, contact_requests, crew_availability, event_coverage_sources, event_crew_assignments, event_crew_media_submissions
-- Do not use this alone as the full SDTV production schema yet.

create table if not exists public."admins" (
  "user_id" uuid not null,
  "email" text,
  "role" text default 'admin'::text,
  "created_at" timestamp with time zone default now(),
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
  "approved_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
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
  "approved_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table if not exists public."contact_requests" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "email" text not null,
  "phone" text,
  "interest" text not null,
  "message" text,
  "created_at" timestamp with time zone default now(),
  "status" text default 'new'::text,
  "source" text default 'website_contact'::text,
  "updated_at" timestamp with time zone default now(),
  "admin_notes" text
);

create table if not exists public."crew_availability" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "user_email" text,
  "available_date" date not null,
  "status" text default 'available'::text not null,
  "note" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
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
  "requested_at" timestamp with time zone,
  "submitted_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table if not exists public."event_crew_assignments" (
  "id" uuid default gen_random_uuid() not null,
  "event_id" uuid,
  "user_id" uuid,
  "assignment_type" text default 'self_selected'::text,
  "created_at" timestamp with time zone default now(),
  "status" text default 'pending'::text,
  "user_email" text,
  "approved_by" text,
  "approved_at" timestamp with time zone,
  "event_title" text,
  "crew_confirmed" boolean default false,
  "coverage_completed" boolean default false,
  "coverage_notes" text,
  "completed_at" timestamp with time zone
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
  "status" text default 'submitted'::text not null
);
