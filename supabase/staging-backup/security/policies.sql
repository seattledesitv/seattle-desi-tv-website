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
