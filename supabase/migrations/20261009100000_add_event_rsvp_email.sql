alter table public.event_rsvps
  add column if not exists attendee_email text;

alter table public.event_rsvps
  drop constraint if exists event_rsvps_attendee_email_check;

alter table public.event_rsvps
  add constraint event_rsvps_attendee_email_check
  check (
    attendee_email is null
    or attendee_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  );

create index if not exists event_rsvps_event_email_idx
  on public.event_rsvps(event_id, lower(attendee_email))
  where attendee_email is not null;

comment on column public.event_rsvps.attendee_email is
  'Primary RSVP submitter email used for event confirmations and reminders; guest emails are not collected.';
