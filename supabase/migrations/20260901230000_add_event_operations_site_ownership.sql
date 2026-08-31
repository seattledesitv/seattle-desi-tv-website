-- Keep event operations attached to the same market as their parent event.

alter table public.event_crew_assignments add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.event_video_workflows add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.event_video_revisions add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.event_video_notifications add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.event_video_workflow_activity add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.event_admin_pocs add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.event_contact_messages add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.event_crew_assignments child set site_id = parent.site_id from public.events parent where child.event_id = parent.id and child.site_id is null;
update public.event_video_workflows child set site_id = parent.site_id from public.events parent where child.event_id = parent.id and child.site_id is null;
update public.event_video_workflow_activity child set site_id = parent.site_id from public.events parent where child.event_id = parent.id and child.site_id is null;
update public.event_admin_pocs child set site_id = parent.site_id from public.events parent where child.event_id = parent.id and child.site_id is null;
update public.event_contact_messages child set site_id = parent.site_id from public.events parent where child.event_id = parent.id and child.site_id is null;
update public.event_video_revisions child set site_id = parent.site_id from public.event_video_workflows parent where child.workflow_id = parent.id and child.site_id is null;
update public.event_video_notifications child set site_id = parent.site_id from public.event_video_workflows parent where child.workflow_id = parent.id and child.site_id is null;

do $$
begin
  if exists (select 1 from public.event_crew_assignments where site_id is null)
     or exists (select 1 from public.event_video_workflows where site_id is null)
     or exists (select 1 from public.event_video_revisions where site_id is null)
     or exists (select 1 from public.event_video_notifications where site_id is null)
     or exists (select 1 from public.event_video_workflow_activity where site_id is null)
     or exists (select 1 from public.event_admin_pocs where site_id is null)
     or exists (select 1 from public.event_contact_messages where site_id is null) then
    raise exception 'Event operations records could not be assigned to their parent event site.';
  end if;
end
$$;

alter table public.event_crew_assignments alter column site_id set not null;
alter table public.event_video_workflows alter column site_id set not null;
alter table public.event_video_revisions alter column site_id set not null;
alter table public.event_video_notifications alter column site_id set not null;
alter table public.event_video_workflow_activity alter column site_id set not null;
alter table public.event_admin_pocs alter column site_id set not null;
alter table public.event_contact_messages alter column site_id set not null;

create or replace function public.set_event_child_site_id()
returns trigger language plpgsql set search_path = public as $$
begin
  select site_id into new.site_id from public.events where id = new.event_id;
  if new.site_id is null then raise exception 'Parent event has no site ownership.'; end if;
  return new;
end
$$;

create or replace function public.set_video_child_site_id()
returns trigger language plpgsql set search_path = public as $$
begin
  select site_id into new.site_id from public.event_video_workflows where id = new.workflow_id;
  if new.site_id is null then raise exception 'Parent video workflow has no site ownership.'; end if;
  return new;
end
$$;

drop trigger if exists set_event_crew_assignment_site on public.event_crew_assignments;
create trigger set_event_crew_assignment_site before insert or update of event_id, site_id on public.event_crew_assignments for each row execute function public.set_event_child_site_id();
drop trigger if exists set_event_video_workflow_site on public.event_video_workflows;
create trigger set_event_video_workflow_site before insert or update of event_id, site_id on public.event_video_workflows for each row execute function public.set_event_child_site_id();
drop trigger if exists set_event_video_activity_site on public.event_video_workflow_activity;
create trigger set_event_video_activity_site before insert or update of event_id, site_id on public.event_video_workflow_activity for each row execute function public.set_event_child_site_id();
drop trigger if exists set_event_admin_poc_site on public.event_admin_pocs;
create trigger set_event_admin_poc_site before insert or update of event_id, site_id on public.event_admin_pocs for each row execute function public.set_event_child_site_id();
drop trigger if exists set_event_contact_message_site on public.event_contact_messages;
create trigger set_event_contact_message_site before insert or update of event_id, site_id on public.event_contact_messages for each row execute function public.set_event_child_site_id();
drop trigger if exists set_event_video_revision_site on public.event_video_revisions;
create trigger set_event_video_revision_site before insert or update of workflow_id, site_id on public.event_video_revisions for each row execute function public.set_video_child_site_id();
drop trigger if exists set_event_video_notification_site on public.event_video_notifications;
create trigger set_event_video_notification_site before insert or update of workflow_id, site_id on public.event_video_notifications for each row execute function public.set_video_child_site_id();

create index if not exists event_crew_assignments_site_created_idx on public.event_crew_assignments (site_id, created_at desc);
create index if not exists event_video_workflows_site_status_idx on public.event_video_workflows (site_id, status, updated_at desc);
create index if not exists event_video_activity_site_created_idx on public.event_video_workflow_activity (site_id, created_at desc);
create index if not exists event_admin_pocs_site_idx on public.event_admin_pocs (site_id);
create index if not exists event_contact_messages_site_created_idx on public.event_contact_messages (site_id, created_at desc);

comment on column public.event_crew_assignments.site_id is 'Market inherited from the parent event.';
comment on column public.event_video_workflows.site_id is 'Market inherited from the parent event.';
