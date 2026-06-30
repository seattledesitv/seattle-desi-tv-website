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
