-- Add POC name for event submissions so event/business POC details can be required consistently.
-- Run before deploying the event form changes if your events table does not already have this column.

alter table public.events
add column if not exists poc_name text;

create index if not exists events_poc_email_idx on public.events (poc_email);
