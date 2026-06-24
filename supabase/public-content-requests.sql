-- Public content/news submission workflow
-- Run in Supabase SQL Editor.

create table if not exists public.public_content_requests (
  id uuid primary key default gen_random_uuid(),
  submitter_name text not null,
  submitter_email text not null,
  submitter_phone text,
  title text not null,
  content_text text,
  image_url text,
  video_url text,
  source_url text,
  requested_channels text[] default '{}',
  status text not null default 'new' check (status in ('new','reviewing','assigned_to_editor','approved_for_publishing','published','rejected','closed')),
  assigned_editor_email text,
  admin_notes text,
  editor_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assigned_at timestamptz,
  published_at timestamptz
);

create index if not exists public_content_requests_status_idx on public.public_content_requests(status);
create index if not exists public_content_requests_created_at_idx on public.public_content_requests(created_at desc);

alter table public.public_content_requests enable row level security;

drop policy if exists "Anyone can submit public content requests" on public.public_content_requests;
create policy "Anyone can submit public content requests"
on public.public_content_requests
for insert
to public
with check (true);

drop policy if exists "Admins can manage public content requests" on public.public_content_requests;
create policy "Admins can manage public content requests"
on public.public_content_requests
for all
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and lower(a.role) like '%admin%'
  )
)
with check (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and lower(a.role) like '%admin%'
  )
);
