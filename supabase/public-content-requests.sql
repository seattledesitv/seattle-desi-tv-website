-- Public content/news submission workflow
-- Run in Supabase SQL Editor.

create table if not exists public.public_content_requests (
  id uuid primary key default gen_random_uuid(),
  submitter_user_id uuid,
  submitter_name text not null,
  submitter_email text not null,
  submitter_phone text,
  submitter_city text,
  submitter_profile_notes text,
  title text not null,
  content_text text,
  image_url text,
  video_url text,
  source_url text,
  requested_channels text[] default '{}',
  status text not null default 'new' check (status in ('new','reviewing','assigned_to_editor','in_editing','review_requested','changes_requested','approved_for_publishing','published','rejected','closed')),
  assigned_editor_email text,
  admin_notes text,
  editor_notes text,
  final_youtube_url text,
  final_instagram_url text,
  final_facebook_url text,
  final_website_url text,
  final_thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assigned_at timestamptz,
  review_requested_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz
);

alter table public.public_content_requests add column if not exists submitter_user_id uuid;
alter table public.public_content_requests add column if not exists submitter_city text;
alter table public.public_content_requests add column if not exists submitter_profile_notes text;
alter table public.public_content_requests add column if not exists final_youtube_url text;
alter table public.public_content_requests add column if not exists final_instagram_url text;
alter table public.public_content_requests add column if not exists final_facebook_url text;
alter table public.public_content_requests add column if not exists final_website_url text;
alter table public.public_content_requests add column if not exists final_thumbnail_url text;
alter table public.public_content_requests add column if not exists review_requested_at timestamptz;
alter table public.public_content_requests add column if not exists approved_at timestamptz;

alter table public.public_content_requests drop constraint if exists public_content_requests_status_check;
alter table public.public_content_requests add constraint public_content_requests_status_check
check (status in ('new','reviewing','assigned_to_editor','in_editing','review_requested','changes_requested','approved_for_publishing','published','rejected','closed'));

create index if not exists public_content_requests_status_idx on public.public_content_requests(status);
create index if not exists public_content_requests_created_at_idx on public.public_content_requests(created_at desc);
create index if not exists public_content_requests_editor_idx on public.public_content_requests(assigned_editor_email);
create index if not exists public_content_requests_submitter_idx on public.public_content_requests(submitter_user_id);

alter table public.public_content_requests enable row level security;

drop policy if exists "Authenticated users can submit public content requests" on public.public_content_requests;
create policy "Authenticated users can submit public content requests"
on public.public_content_requests
for insert
to authenticated
with check (auth.uid() = submitter_user_id);

drop policy if exists "Anyone can submit public content requests" on public.public_content_requests;

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

drop policy if exists "Submitters can read their own public content requests" on public.public_content_requests;
create policy "Submitters can read their own public content requests"
on public.public_content_requests
for select
to authenticated
using (auth.uid() = submitter_user_id);

drop policy if exists "Assigned editors can read public content requests" on public.public_content_requests;
create policy "Assigned editors can read public content requests"
on public.public_content_requests
for select
to authenticated
using (
  lower(assigned_editor_email) = lower((auth.jwt() ->> 'email'))
);

drop policy if exists "Assigned editors can update public content requests" on public.public_content_requests;
create policy "Assigned editors can update public content requests"
on public.public_content_requests
for update
to authenticated
using (
  lower(assigned_editor_email) = lower((auth.jwt() ->> 'email'))
)
with check (
  lower(assigned_editor_email) = lower((auth.jwt() ->> 'email'))
);
