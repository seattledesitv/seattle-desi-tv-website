alter table public.event_rsvps
  add column if not exists guest_details jsonb not null default '[]'::jsonb;

comment on column public.event_rsvps.guest_details is
  'Additional RSVP guests stored as objects containing name and category (adult or kid).';
