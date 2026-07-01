-- SDTV Restore v2: unique and check constraints
-- Run after primary-keys.sql and before foreign-keys-core.sql.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admins_email_key') then
    alter table public.admins add constraint admins_email_key unique (email);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'community_groups_status_check') then
    alter table public.community_groups add constraint community_groups_status_check
    check (status = any (array['pending'::text, 'approved'::text, 'on_hold'::text, 'rejected'::text]));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'community_organizations_status_check') then
    alter table public.community_organizations add constraint community_organizations_status_check
    check (status = any (array['pending'::text, 'approved'::text, 'on_hold'::text, 'rejected'::text]));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_deliverables_event_type_unique') then
    alter table public.event_deliverables add constraint event_deliverables_event_type_unique unique (event_id, deliverable_type);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_influencer_intents_status_check') then
    alter table public.event_influencer_intents add constraint event_influencer_intents_status_check
    check (status = any (array['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text]));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_influencer_intents_event_id_user_email_key') then
    alter table public.event_influencer_intents add constraint event_influencer_intents_event_id_user_email_key unique (event_id, user_email);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_video_workflows_status_check') then
    alter table public.event_video_workflows add constraint event_video_workflows_status_check
    check (status = any (array[
      'ready_for_editing'::text,
      'in_editing'::text,
      'awaiting_crew_review'::text,
      'changes_requested'::text,
      'crew_approved'::text,
      'awaiting_admin_approval'::text,
      'approved_for_publishing'::text,
      'published_complete'::text
    ]));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_video_workflows_event_unique') then
    alter table public.event_video_workflows add constraint event_video_workflows_event_unique unique (event_id);
  end if;
end $$;
