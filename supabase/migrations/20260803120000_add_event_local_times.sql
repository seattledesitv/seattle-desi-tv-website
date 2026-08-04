alter table public.events
  add column if not exists local_start_time time without time zone,
  add column if not exists local_end_time time without time zone,
  add column if not exists event_timezone text not null default 'America/Los_Angeles';

comment on column public.events.local_start_time is 'Event start time in the event local timezone.';
comment on column public.events.local_end_time is 'Optional event end time in the event local timezone.';
comment on column public.events.event_timezone is 'IANA timezone used to interpret the event date and local times.';
