-- Constraints captured from production.
-- Idempotent wrappers prevent duplicate constraint errors.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "admins_user_id_fkey") then
    alter table public."admins" add constraint "admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "admins_pkey") then
    alter table public."admins" add constraint "admins_pkey" PRIMARY KEY (user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "admins_email_key") then
    alter table public."admins" add constraint "admins_email_key" UNIQUE (email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "community_groups_status_check") then
    alter table public."community_groups" add constraint "community_groups_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'on_hold'::text, 'rejected'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "community_groups_submitted_by_fkey") then
    alter table public."community_groups" add constraint "community_groups_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "community_groups_pkey") then
    alter table public."community_groups" add constraint "community_groups_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "community_organizations_status_check") then
    alter table public."community_organizations" add constraint "community_organizations_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'on_hold'::text, 'rejected'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "community_organizations_submitted_by_fkey") then
    alter table public."community_organizations" add constraint "community_organizations_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "community_organizations_pkey") then
    alter table public."community_organizations" add constraint "community_organizations_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "contact_requests_pkey") then
    alter table public."contact_requests" add constraint "contact_requests_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "crew_availability_pkey") then
    alter table public."crew_availability" add constraint "crew_availability_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "crew_availability_user_id_available_date_key") then
    alter table public."crew_availability" add constraint "crew_availability_user_id_available_date_key" UNIQUE (user_id, available_date);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_coverage_sources_source_type_check") then
    alter table public."event_coverage_sources" add constraint "event_coverage_sources_source_type_check" CHECK (source_type = ANY (ARRAY['crew'::text, 'influencer'::text, 'organizer_media'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_coverage_sources_status_check") then
    alter table public."event_coverage_sources" add constraint "event_coverage_sources_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'requested'::text, 'available'::text, 'assigned_to_editor'::text, 'editing'::text, 'published'::text, 'not_available'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_coverage_sources_event_id_fkey") then
    alter table public."event_coverage_sources" add constraint "event_coverage_sources_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_coverage_sources_pkey") then
    alter table public."event_coverage_sources" add constraint "event_coverage_sources_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_crew_assignments_event_id_fkey") then
    alter table public."event_crew_assignments" add constraint "event_crew_assignments_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_crew_assignments_user_id_fkey") then
    alter table public."event_crew_assignments" add constraint "event_crew_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_crew_assignments_pkey") then
    alter table public."event_crew_assignments" add constraint "event_crew_assignments_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_crew_assignments_event_id_user_id_key") then
    alter table public."event_crew_assignments" add constraint "event_crew_assignments_event_id_user_id_key" UNIQUE (event_id, user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_crew_media_submissions_assignment_id_fkey") then
    alter table public."event_crew_media_submissions" add constraint "event_crew_media_submissions_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES event_crew_assignments(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_crew_media_submissions_event_id_fkey") then
    alter table public."event_crew_media_submissions" add constraint "event_crew_media_submissions_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_crew_media_submissions_pkey") then
    alter table public."event_crew_media_submissions" add constraint "event_crew_media_submissions_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_deliverables_completed_by_fkey") then
    alter table public."event_deliverables" add constraint "event_deliverables_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_deliverables_event_id_fkey") then
    alter table public."event_deliverables" add constraint "event_deliverables_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_deliverables_pkey") then
    alter table public."event_deliverables" add constraint "event_deliverables_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_deliverables_event_type_unique") then
    alter table public."event_deliverables" add constraint "event_deliverables_event_type_unique" UNIQUE (event_id, deliverable_type);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_influencer_intents_status_check") then
    alter table public."event_influencer_intents" add constraint "event_influencer_intents_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_influencer_intents_event_id_fkey") then
    alter table public."event_influencer_intents" add constraint "event_influencer_intents_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_influencer_intents_influencer_profile_id_fkey") then
    alter table public."event_influencer_intents" add constraint "event_influencer_intents_influencer_profile_id_fkey" FOREIGN KEY (influencer_profile_id) REFERENCES influencer_profiles(id) ON DELETE SET NULL;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_influencer_intents_pkey") then
    alter table public."event_influencer_intents" add constraint "event_influencer_intents_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_influencer_intents_event_id_user_email_key") then
    alter table public."event_influencer_intents" add constraint "event_influencer_intents_event_id_user_email_key" UNIQUE (event_id, user_email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_notifications_recipient_user_id_fkey") then
    alter table public."event_video_notifications" add constraint "event_video_notifications_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_notifications_workflow_id_fkey") then
    alter table public."event_video_notifications" add constraint "event_video_notifications_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES event_video_workflows(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_notifications_pkey") then
    alter table public."event_video_notifications" add constraint "event_video_notifications_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_revisions_submitted_by_fkey") then
    alter table public."event_video_revisions" add constraint "event_video_revisions_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_revisions_workflow_id_fkey") then
    alter table public."event_video_revisions" add constraint "event_video_revisions_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES event_video_workflows(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_revisions_pkey") then
    alter table public."event_video_revisions" add constraint "event_video_revisions_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_workflows_status_check") then
    alter table public."event_video_workflows" add constraint "event_video_workflows_status_check" CHECK (status = ANY (ARRAY['ready_for_editing'::text, 'in_editing'::text, 'awaiting_crew_review'::text, 'changes_requested'::text, 'crew_approved'::text, 'awaiting_admin_approval'::text, 'approved_for_publishing'::text, 'published_complete'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_workflows_created_by_fkey") then
    alter table public."event_video_workflows" add constraint "event_video_workflows_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_workflows_event_id_fkey") then
    alter table public."event_video_workflows" add constraint "event_video_workflows_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_workflows_updated_by_fkey") then
    alter table public."event_video_workflows" add constraint "event_video_workflows_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_workflows_pkey") then
    alter table public."event_video_workflows" add constraint "event_video_workflows_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "event_video_workflows_event_unique") then
    alter table public."event_video_workflows" add constraint "event_video_workflows_event_unique" UNIQUE (event_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "events_created_by_fkey") then
    alter table public."events" add constraint "events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "events_pkey") then
    alter table public."events" add constraint "events_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "featured_social_content_pkey") then
    alter table public."featured_social_content" add constraint "featured_social_content_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "festival_hero_assets_pkey") then
    alter table public."festival_hero_assets" add constraint "festival_hero_assets_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "hero_analytics_pkey") then
    alter table public."hero_analytics" add constraint "hero_analytics_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "homepage_hero_banners_pkey") then
    alter table public."homepage_hero_banners" add constraint "homepage_hero_banners_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "homepage_settings_section_key_check") then
    alter table public."homepage_settings" add constraint "homepage_settings_section_key_check" CHECK (section_key = ANY (ARRAY['home'::text, 'stats'::text, 'events'::text, 'businesses'::text, 'radio'::text, 'videos'::text, 'featured_social'::text, 'testimonials'::text, 'social'::text, 'team'::text, 'sponsors'::text, 'contact'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "homepage_settings_pkey") then
    alter table public."homepage_settings" add constraint "homepage_settings_pkey" PRIMARY KEY (section_key);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "homepage_sponsors_pkey") then
    alter table public."homepage_sponsors" add constraint "homepage_sponsors_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "homepage_testimonials_pkey") then
    alter table public."homepage_testimonials" add constraint "homepage_testimonials_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "influencer_profiles_status_check") then
    alter table public."influencer_profiles" add constraint "influencer_profiles_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'hidden'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "influencer_profiles_pkey") then
    alter table public."influencer_profiles" add constraint "influencer_profiles_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "influencer_profiles_email_key") then
    alter table public."influencer_profiles" add constraint "influencer_profiles_email_key" UNIQUE (email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "local_businesses_created_by_fkey") then
    alter table public."local_businesses" add constraint "local_businesses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "local_businesses_pkey") then
    alter table public."local_businesses" add constraint "local_businesses_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "newsletter_campaigns_status_check") then
    alter table public."newsletter_campaigns" add constraint "newsletter_campaigns_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'test_sent'::text, 'sent'::text, 'archived'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "newsletter_campaigns_pkey") then
    alter table public."newsletter_campaigns" add constraint "newsletter_campaigns_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "newsletter_settings_pkey") then
    alter table public."newsletter_settings" add constraint "newsletter_settings_pkey" PRIMARY KEY (section_key);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "newsletter_subscribers_status_check") then
    alter table public."newsletter_subscribers" add constraint "newsletter_subscribers_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'unsubscribed'::text, 'bounced'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "newsletter_subscribers_pkey") then
    alter table public."newsletter_subscribers" add constraint "newsletter_subscribers_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "newsletter_subscribers_email_key") then
    alter table public."newsletter_subscribers" add constraint "newsletter_subscribers_email_key" UNIQUE (email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "notifications_pkey") then
    alter table public."notifications" add constraint "notifications_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "public_content_requests_status_check") then
    alter table public."public_content_requests" add constraint "public_content_requests_status_check" CHECK (status = ANY (ARRAY['new'::text, 'reviewing'::text, 'assigned_to_editor'::text, 'in_editing'::text, 'review_requested'::text, 'changes_requested'::text, 'approved_for_publishing'::text, 'published'::text, 'rejected'::text, 'closed'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "public_content_requests_pkey") then
    alter table public."public_content_requests" add constraint "public_content_requests_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "public_visibility_controls_pkey") then
    alter table public."public_visibility_controls" add constraint "public_visibility_controls_pkey" PRIMARY KEY (email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "radio_team_members_created_by_fkey") then
    alter table public."radio_team_members" add constraint "radio_team_members_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "radio_team_members_pkey") then
    alter table public."radio_team_members" add constraint "radio_team_members_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "social_media_stats_pkey") then
    alter table public."social_media_stats" add constraint "social_media_stats_pkey" PRIMARY KEY (platform);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "sponsors_pkey") then
    alter table public."sponsors" add constraint "sponsors_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "team_members_created_by_fkey") then
    alter table public."team_members" add constraint "team_members_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "team_members_pkey") then
    alter table public."team_members" add constraint "team_members_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "user_profiles_pkey") then
    alter table public."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY (user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "user_profiles_email_key") then
    alter table public."user_profiles" add constraint "user_profiles_email_key" UNIQUE (email);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "user_role_requests_status_check") then
    alter table public."user_role_requests" add constraint "user_role_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'awaiting_orientation'::text, 'awaiting_onboarding'::text, 'awaiting_team_role_access'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "user_role_requests_pkey") then
    alter table public."user_role_requests" add constraint "user_role_requests_pkey" PRIMARY KEY (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = "volunteer_onboarding_submissions_pkey") then
    alter table public."volunteer_onboarding_submissions" add constraint "volunteer_onboarding_submissions_pkey" PRIMARY KEY (id);
  end if;
end $$;
