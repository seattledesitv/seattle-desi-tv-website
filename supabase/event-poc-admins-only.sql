-- Event Admin POC LOV guardrails
-- The Event Ops Admin POC dropdown reads from public.admins.
-- This keeps that table restricted to true admin roles and optionally lets you hide
-- an admin from being used as an event POC later.

alter table public.admins
add column if not exists available_for_event_poc boolean not null default true;

-- Normalize common role spellings already in the table.
update public.admins
set role = lower(replace(coalesce(role, ''), '-', '_'))
where role is not null;

-- Remove any non-admin rows that were accidentally stored in public.admins.
-- Team member / volunteer access should live in user_role_requests or profile tables,
-- not in public.admins.
delete from public.admins
where lower(replace(coalesce(role, ''), '-', '_')) not in (
  'super_admin',
  'pm_admin',
  'admin',
  'event_admin'
);

-- Prevent future non-admin roles from being inserted into public.admins.
alter table public.admins
drop constraint if exists admins_role_admin_only_check;

alter table public.admins
add constraint admins_role_admin_only_check
check (
  lower(replace(coalesce(role, ''), '-', '_')) in (
    'super_admin',
    'pm_admin',
    'admin',
    'event_admin'
  )
);

create index if not exists admins_event_poc_lookup_idx
on public.admins (available_for_event_poc, role, email);

-- Optional: to hide a specific admin from Event POC assignment later:
-- update public.admins
-- set available_for_event_poc = false
-- where email = 'person@example.com';
