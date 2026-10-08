alter table public.event_rsvps
  add column if not exists guest_names jsonb not null default '[]'::jsonb,
  add column if not exists party_size integer not null default 1;

alter table public.event_rsvps
  drop constraint if exists event_rsvps_party_size_check;

alter table public.event_rsvps
  add constraint event_rsvps_party_size_check
  check (party_size between 1 and 11);

comment on column public.event_rsvps.guest_names is
  'Names of additional guests included with the primary attendee RSVP.';
comment on column public.event_rsvps.party_size is
  'Total people attending under this RSVP, including the primary attendee.';
