-- Fix Seattle Desi TV login-dependent dashboard/event visibility issues
-- Run this in Supabase SQL Editor for the live project.

-- 1) The frontend reads/writes events.status and local_businesses.status.
-- If these columns are missing, public Events/Businesses can appear empty.
alter table public.events
  add column if not exists status text not null default 'approved',
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

alter table public.local_businesses
  add column if not exists status text not null default 'approved',
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

-- Make older rows visible immediately.
update public.events
set status = 'approved'
where status is null;

update public.local_businesses
set status = 'approved'
where status is null;

-- 2) The app also stores approval metadata and edits/deletes records from Studio.
-- Keep RLS enabled, but add explicit admin policies for the actions Studio uses.
alter table public.events enable row level security;
alter table public.local_businesses enable row level security;

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
on public.events for delete to authenticated
using (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or a.email = auth.jwt() ->> 'email')
      and lower(a.role) like '%admin%'
  )
);

drop policy if exists "Admins can update local businesses" on public.local_businesses;
create policy "Admins can update local businesses"
on public.local_businesses for update to authenticated
using (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or a.email = auth.jwt() ->> 'email')
      and lower(a.role) like '%admin%'
  )
)
with check (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or a.email = auth.jwt() ->> 'email')
      and lower(a.role) like '%admin%'
  )
);

drop policy if exists "Admins can delete local businesses" on public.local_businesses;
create policy "Admins can delete local businesses"
on public.local_businesses for delete to authenticated
using (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or a.email = auth.jwt() ->> 'email')
      and lower(a.role) like '%admin%'
  )
);

-- 3) Optional check: after running this, this should return rows if events exist.
-- select id, title, date, status from public.events order by created_at desc;
