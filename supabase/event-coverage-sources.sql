-- Event coverage source workflow
-- Run this in Supabase SQL Editor before using organizer media recovery.

create table if not exists public.event_coverage_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source_type text not null check (source_type in ('crew', 'influencer', 'organizer_media')),
  status text not null default 'pending' check (status in ('pending', 'requested', 'available', 'assigned_to_editor', 'editing', 'published', 'not_available')),
  source_url text,
  platform text,
  contact_name text,
  contact_email text,
  notes text,
  requested_by uuid,
  requested_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_coverage_sources_event_id_idx on public.event_coverage_sources(event_id);
create index if not exists event_coverage_sources_status_idx on public.event_coverage_sources(status);

alter table public.event_coverage_sources enable row level security;

drop policy if exists "Admins can manage coverage sources" on public.event_coverage_sources;
create policy "Admins can manage coverage sources"
on public.event_coverage_sources
for all
using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and a.role in ('super_admin', 'pm_admin', 'admin')
  )
)
with check (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and a.role in ('super_admin', 'pm_admin', 'admin')
  )
);

-- Organizer submissions are handled through the public page.
-- This permissive policy is intentionally limited by the page inserting only organizer_media rows.
drop policy if exists "Organizers can submit event media sources" on public.event_coverage_sources;
create policy "Organizers can submit event media sources"
on public.event_coverage_sources
for insert
with check (source_type = 'organizer_media' and status in ('available', 'requested'));

-- Optional: let public submitter read the event title/date from a public tokenless media form.
-- The page only queries approved event metadata by event id.
