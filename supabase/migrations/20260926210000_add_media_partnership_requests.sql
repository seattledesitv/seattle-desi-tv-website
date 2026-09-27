create table if not exists public.media_partnership_requests (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  organization_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  event_title text not null,
  event_date date not null,
  event_location text not null,
  event_url text,
  event_type text not null check (event_type in ('nonprofit_community', 'private_ticketed')),
  notes text,
  flyer_file_path text not null,
  flyer_file_name text not null,
  flyer_mime_type text not null,
  flyer_file_size bigint not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_partnership_requests_site_status_idx
  on public.media_partnership_requests (site_id, status, created_at desc);

alter table public.media_partnership_requests enable row level security;
revoke all on public.media_partnership_requests from anon, authenticated;
grant all on public.media_partnership_requests to service_role;

comment on table public.media_partnership_requests is
  'Private requests inviting SDTV to serve as an event media partner. Public submission and Studio access occur only through protected server routes.';
