-- Optional cleanup/fix for Event Ops Admin POC dropdown.
-- The Event Ops UI reads from public.admins. If non-admin roles were accidentally stored
-- in public.admins, remove them from that table so they do not appear in Admin POC LOVs.
-- Run after confirming non-admin access is managed through user_role_requests / profiles,
-- not the admins table.

delete from public.admins
where lower(replace(coalesce(role, ''), '-', '_')) not in (
  'super_admin',
  'pm_admin',
  'admin',
  'event_admin'
);

-- Helpful index for role-filtered admin lookups.
create index if not exists admins_role_email_idx on public.admins (role, email);
