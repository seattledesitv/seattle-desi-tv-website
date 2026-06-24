-- Contact Requests admin workflow support
-- Run this in Supabase SQL Editor if Studio Contact Requests shows 0 rows even though records exist.

alter table public.contact_requests add column if not exists source text default 'website_contact';
alter table public.contact_requests add column if not exists status text default 'new';
alter table public.contact_requests add column if not exists updated_at timestamptz default now();
alter table public.contact_requests add column if not exists admin_notes text;

alter table public.contact_requests enable row level security;

drop policy if exists "Admins can read contact requests" on public.contact_requests;
create policy "Admins can read contact requests"
on public.contact_requests
for select
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and lower(a.role) like '%admin%'
  )
);

drop policy if exists "Admins can update contact requests" on public.contact_requests;
create policy "Admins can update contact requests"
on public.contact_requests
for update
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and lower(a.role) like '%admin%'
  )
)
with check (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and lower(a.role) like '%admin%'
  )
);

-- Keep public submissions enabled.
drop policy if exists "Anyone can submit contact requests" on public.contact_requests;
create policy "Anyone can submit contact requests"
on public.contact_requests
for insert
to public
with check (true);
