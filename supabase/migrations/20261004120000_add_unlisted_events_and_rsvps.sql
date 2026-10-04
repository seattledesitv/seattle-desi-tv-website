alter table public.events
  add column if not exists visibility text not null default 'public',
  add column if not exists simple_rsvp_enabled boolean not null default false;

alter table public.events
  drop constraint if exists events_visibility_check;

alter table public.events
  add constraint events_visibility_check
  check (visibility in ('public', 'unlisted'));

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete cascade,
  attendee_name text not null check (char_length(trim(attendee_name)) between 1 and 100),
  response text not null default 'attending' check (response in ('attending')),
  source text not null default 'website' check (source in ('website', 'whatsapp', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists event_rsvps_event_created_idx
  on public.event_rsvps(event_id, created_at desc);

alter table public.event_rsvps enable row level security;

drop policy if exists "event rsvps admins read" on public.event_rsvps;
create policy "event rsvps admins read"
on public.event_rsvps for select
using (
  exists (
    select 1 from public.admins
    where admins.user_id = auth.uid()
       or lower(admins.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

comment on column public.events.visibility is
  'public appears in SDTV discovery surfaces; unlisted is accessible only through its direct link.';
comment on column public.events.simple_rsvp_enabled is
  'Enables the lightweight name-only attending response on the event detail page.';
comment on table public.event_rsvps is
  'Lightweight event attendance confirmations from the website and future WhatsApp integration.';
