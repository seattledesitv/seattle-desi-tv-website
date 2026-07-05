-- Enhances event video workflow for crew assignment workspace.
-- Run this before deploying the updated My Coverage Assignments page.

alter table public.event_video_workflows
add column if not exists upload_destination_url text,
add column if not exists crew_shared_folder_url text,
add column if not exists crew_review_decision text,
add column if not exists crew_review_notes text,
add column if not exists crew_reviewed_at timestamptz,
add column if not exists draft_video_url text,
add column if not exists final_video_url text;

create table if not exists public.event_video_workflow_activity (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  workflow_id uuid references public.event_video_workflows(id) on delete cascade,
  actor_user_id uuid,
  actor_email text,
  activity_type text not null,
  notes text,
  created_at timestamptz default now()
);

alter table public.event_video_workflow_activity enable row level security;

drop policy if exists event_video_workflow_activity_admin_read on public.event_video_workflow_activity;
drop policy if exists event_video_workflow_activity_crew_read on public.event_video_workflow_activity;

create policy event_video_workflow_activity_admin_read on public.event_video_workflow_activity
for select to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy event_video_workflow_activity_crew_read on public.event_video_workflow_activity
for select to authenticated
using (
  exists (
    select 1 from public.event_crew_assignments eca
    where eca.event_id = event_video_workflow_activity.event_id
    and eca.user_id = auth.uid()
  )
);

create index if not exists event_video_workflow_activity_event_idx
on public.event_video_workflow_activity (event_id, created_at desc);
