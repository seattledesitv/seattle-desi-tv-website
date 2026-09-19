alter table public.events
  add column if not exists end_date date;

alter table public.events
  drop constraint if exists events_end_date_not_before_start;

alter table public.events
  add constraint events_end_date_not_before_start
  check (end_date is null or end_date >= date);

comment on column public.events.date is 'First calendar day of the event.';
comment on column public.events.end_date is 'Optional final calendar day, inclusive. Null means a single-day event.';
