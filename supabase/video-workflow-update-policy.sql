-- Video workflow RLS policy fix
-- Run this in Supabase SQL Editor if editor Start Editing / Submit For Crew Review does not persist.

alter table public.event_video_workflows enable row level security;
alter table public.event_video_revisions enable row level security;

drop policy if exists "Video workflows readable by authenticated users" on public.event_video_workflows;
create policy "Video workflows readable by authenticated users"
  on public.event_video_workflows
  for select
  to authenticated
  using (true);

drop policy if exists "Video workflows insertable by authenticated users" on public.event_video_workflows;
create policy "Video workflows insertable by authenticated users"
  on public.event_video_workflows
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Video workflows updatable by authenticated users" on public.event_video_workflows;
create policy "Video workflows updatable by authenticated users"
  on public.event_video_workflows
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Video revisions readable by authenticated users" on public.event_video_revisions;
create policy "Video revisions readable by authenticated users"
  on public.event_video_revisions
  for select
  to authenticated
  using (true);

drop policy if exists "Video revisions insertable by authenticated users" on public.event_video_revisions;
create policy "Video revisions insertable by authenticated users"
  on public.event_video_revisions
  for insert
  to authenticated
  with check (auth.uid() is not null);

-- Quick check after editor submits a draft:
-- select id, event_id, status, assigned_editor_email, crew_reviewer_email, updated_at
-- from public.event_video_workflows
-- order by updated_at desc;
--
-- select workflow_id, revision_number, full_video_url, reel_url, submitted_by_email, created_at
-- from public.event_video_revisions
-- order by created_at desc;
