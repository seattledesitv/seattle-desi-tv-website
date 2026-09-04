alter table public.event_ticket_settings
  add column if not exists parking_info text;

comment on column public.event_ticket_settings.parking_info is
  'Organizer-provided parking and arrival instructions shown to purchasers and included in ticket confirmation emails.';
