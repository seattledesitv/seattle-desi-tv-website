alter table public.event_rsvps
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists reminder_email_id text,
  add column if not exists reminder_error text;

create index if not exists event_rsvps_pending_reminder_idx
  on public.event_rsvps(event_id, reminder_sent_at)
  where attendee_email is not null and reminder_sent_at is null;

comment on column public.event_rsvps.reminder_sent_at is
  'Time the automatic pre-event RSVP reminder was successfully delivered.';
comment on column public.event_rsvps.reminder_email_id is
  'Email provider delivery identifier for the automatic RSVP reminder.';
comment on column public.event_rsvps.reminder_error is
  'Most recent automatic reminder delivery error, retained for operational review and retry.';
