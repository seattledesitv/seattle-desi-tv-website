-- Triggers captured from production.
-- Run after tables and functions exist.

drop trigger if exists featured_social_content_updated_at on public.featured_social_content;
create trigger featured_social_content_updated_at before update on public.featured_social_content for each row execute function update_updated_at_column();

drop trigger if exists homepage_testimonials_updated_at on public.homepage_testimonials;
create trigger homepage_testimonials_updated_at before update on public.homepage_testimonials for each row execute function update_updated_at_column();

drop trigger if exists radio_team_members_set_updated_at on public.radio_team_members;
create trigger radio_team_members_set_updated_at before update on public.radio_team_members for each row execute function set_updated_at();

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at before update on public.team_members for each row execute function set_updated_at();

drop trigger if exists user_role_requests_updated_at on public.user_role_requests;
create trigger user_role_requests_updated_at before update on public.user_role_requests for each row execute function update_updated_at_column();

drop trigger if exists volunteer_onboarding_set_updated_at on public.volunteer_onboarding_submissions;
create trigger volunteer_onboarding_set_updated_at before update on public.volunteer_onboarding_submissions for each row execute function set_updated_at();

drop trigger if exists volunteer_onboarding_submitted_status on public.volunteer_onboarding_submissions;
create trigger volunteer_onboarding_submitted_status after insert on public.volunteer_onboarding_submissions for each row execute function mark_volunteer_onboarding_submitted();
