-- SDTV Event Crew Media Submissions
-- Run this in Supabase SQL Editor before testing the updated crew submission flow.

create table if not exists public.event_crew_media_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.event_crew_assignments(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid,
  user_email text,
  has_content boolean not null default true,
  raw_video_url text,
  photos_url text,
  other_media_url text,
  notes text,
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists event_crew_media_submissions_assignment_unique
on public.event_crew_media_submissions(assignment_id)
where assignment_id is not null;

create index if not exists event_crew_media_submissions_event_id_idx
on public.event_crew_media_submissions(event_id);

alter table public.event_crew_media_submissions enable row level security;

-- Simple MVP policies. Adjust later if you want stricter role-based access.
drop policy if exists "crew media submissions read" on public.event_crew_media_submissions;
create policy "crew media submissions read"
on public.event_crew_media_submissions for select
using (true);

drop policy if exists "crew media submissions insert own" on public.event_crew_media_submissions;
create policy "crew media submissions insert own"
on public.event_crew_media_submissions for insert
with check (auth.uid() = user_id or user_id is null);

drop policy if exists "crew media submissions update own" on public.event_crew_media_submissions;
create policy "crew media submissions update own"
on public.event_crew_media_submissions for update
using (auth.uid() = user_id or user_id is null)
with check (auth.uid() = user_id or user_id is null);
