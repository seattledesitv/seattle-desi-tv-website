-- Event video production workflow for Seattle Desi TV
-- Run this in the Supabase SQL editor before using /studio/video-production.

create extension if not exists pgcrypto;

create table if not exists public.event_video_workflows (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'ready_for_editing',
  assigned_editor_email text,
  crew_reviewer_email text,
  admin_approver_email text,
  raw_media_url text,
  external_media_url text,
  crew_notes text,
  editor_notes text,
  publish_notes text,
  youtube_url text,
  instagram_url text,
  facebook_url text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  crew_approved_at timestamptz,
  admin_approved_at timestamptz,
  published_at timestamptz,
  constraint event_video_workflows_event_unique unique (event_id),
  constraint event_video_workflows_status_check check (
    status in (
      'ready_for_editing',
      'in_editing',
      'awaiting_crew_review',
      'changes_requested',
      'crew_approved',
      'awaiting_admin_approval',
      'approved_for_publishing',
      'published_complete'
    )
  )
);

create table if not exists public.event_video_revisions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.event_video_workflows(id) on delete cascade,
  revision_number integer not null default 1,
  full_video_url text,
  reel_url text,
  youtube_title text,
  youtube_description text,
  instagram_caption text,
  thumbnail_url text,
  feedback text,
  submitted_by uuid references auth.users(id),
  submitted_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.event_video_notifications (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.event_video_workflows(id) on delete cascade,
  recipient_email text,
  recipient_user_id uuid references auth.users(id),
  notification_type text not null,
  title text not null,
  message text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists event_video_workflows_event_id_idx on public.event_video_workflows(event_id);
create index if not exists event_video_workflows_status_idx on public.event_video_workflows(status);
create index if not exists event_video_workflows_editor_idx on public.event_video_workflows(lower(assigned_editor_email));
create index if not exists event_video_workflows_crew_idx on public.event_video_workflows(lower(crew_reviewer_email));
create index if not exists event_video_revisions_workflow_idx on public.event_video_revisions(workflow_id, revision_number desc);
create index if not exists event_video_notifications_recipient_idx on public.event_video_notifications(recipient_user_id, is_read);

alter table public.event_video_workflows enable row level security;
alter table public.event_video_revisions enable row level security;
alter table public.event_video_notifications enable row level security;

drop policy if exists "Video workflows readable by authenticated users" on public.event_video_workflows;
create policy "Video workflows readable by authenticated users"
  on public.event_video_workflows for select
  to authenticated
  using (true);

drop policy if exists "Video workflows insertable by authenticated users" on public.event_video_workflows;
create policy "Video workflows insertable by authenticated users"
  on public.event_video_workflows for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Video workflows updatable by authenticated users" on public.event_video_workflows;
create policy "Video workflows updatable by authenticated users"
  on public.event_video_workflows for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Video revisions readable by authenticated users" on public.event_video_revisions;
create policy "Video revisions readable by authenticated users"
  on public.event_video_revisions for select
  to authenticated
  using (true);

drop policy if exists "Video revisions insertable by authenticated users" on public.event_video_revisions;
create policy "Video revisions insertable by authenticated users"
  on public.event_video_revisions for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Video notifications readable by recipient" on public.event_video_notifications;
create policy "Video notifications readable by recipient"
  on public.event_video_notifications for select
  to authenticated
  using (recipient_user_id = auth.uid() or recipient_user_id is null);

drop policy if exists "Video notifications insertable by authenticated users" on public.event_video_notifications;
create policy "Video notifications insertable by authenticated users"
  on public.event_video_notifications for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Video notifications updatable by recipient" on public.event_video_notifications;
create policy "Video notifications updatable by recipient"
  on public.event_video_notifications for update
  to authenticated
  using (recipient_user_id = auth.uid() or recipient_user_id is null)
  with check (recipient_user_id = auth.uid() or recipient_user_id is null);
