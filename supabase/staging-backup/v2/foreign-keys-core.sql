-- SDTV Restore v2: core foreign keys
-- Run after primary-keys.sql and unique-and-checks.sql.
-- This file covers the high-confidence relationships validated during staging setup.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admins_user_id_fkey') then
    alter table public.admins add constraint admins_user_id_fkey foreign key (user_id) references auth.users(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_created_by_fkey') then
    alter table public.events add constraint events_created_by_fkey foreign key (created_by) references auth.users(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_coverage_sources_event_id_fkey') then
    alter table public.event_coverage_sources add constraint event_coverage_sources_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_crew_assignments_event_id_fkey') then
    alter table public.event_crew_assignments add constraint event_crew_assignments_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_crew_media_submissions_assignment_id_fkey') then
    alter table public.event_crew_media_submissions add constraint event_crew_media_submissions_assignment_id_fkey foreign key (assignment_id) references public.event_crew_assignments(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_crew_media_submissions_event_id_fkey') then
    alter table public.event_crew_media_submissions add constraint event_crew_media_submissions_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_deliverables_event_id_fkey') then
    alter table public.event_deliverables add constraint event_deliverables_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_deliverables_completed_by_fkey') then
    alter table public.event_deliverables add constraint event_deliverables_completed_by_fkey foreign key (completed_by) references auth.users(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_influencer_intents_event_id_fkey') then
    alter table public.event_influencer_intents add constraint event_influencer_intents_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_influencer_intents_influencer_profile_id_fkey') then
    alter table public.event_influencer_intents add constraint event_influencer_intents_influencer_profile_id_fkey foreign key (influencer_profile_id) references public.influencer_profiles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_video_workflows_event_id_fkey') then
    alter table public.event_video_workflows add constraint event_video_workflows_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_video_notifications_workflow_id_fkey') then
    alter table public.event_video_notifications add constraint event_video_notifications_workflow_id_fkey foreign key (workflow_id) references public.event_video_workflows(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_video_revisions_workflow_id_fkey') then
    alter table public.event_video_revisions add constraint event_video_revisions_workflow_id_fkey foreign key (workflow_id) references public.event_video_workflows(id) on delete cascade;
  end if;
end $$;
