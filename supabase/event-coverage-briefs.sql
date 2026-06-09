-- Coverage brief and deliverables checklist for SDTV events
-- Run this in Supabase SQL editor.

alter table public.events
  add column if not exists coverage_brief text,
  add column if not exists required_shots text,
  add column if not exists interview_targets text,
  add column if not exists sponsor_requirements text,
  add column if not exists special_instructions text;

create table if not exists public.event_deliverables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  deliverable_type text not null,
  required boolean not null default true,
  completed boolean not null default false,
  completed_by uuid references auth.users(id),
  completed_by_email text,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_deliverables_event_type_unique unique (event_id, deliverable_type)
);

create index if not exists event_deliverables_event_id_idx on public.event_deliverables(event_id);
create index if not exists event_deliverables_completed_idx on public.event_deliverables(event_id, completed);

alter table public.event_deliverables enable row level security;

drop policy if exists "Event deliverables readable by authenticated users" on public.event_deliverables;
create policy "Event deliverables readable by authenticated users"
  on public.event_deliverables for select
  to authenticated
  using (true);

drop policy if exists "Event deliverables insertable by authenticated users" on public.event_deliverables;
create policy "Event deliverables insertable by authenticated users"
  on public.event_deliverables for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Event deliverables updatable by authenticated users" on public.event_deliverables;
create policy "Event deliverables updatable by authenticated users"
  on public.event_deliverables for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Optional starter deliverables can be created by the app per event:
-- Full Event Video, Highlight Reel, Interview Reel, Sponsor Reel, Photos, Social Media Post
