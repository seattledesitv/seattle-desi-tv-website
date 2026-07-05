create table if not exists public.event_admin_pocs (
  event_id uuid primary key references public.events(id) on delete cascade,
  admin_user_id uuid,
  admin_email text,
  admin_name text,
  admin_phone text,
  admin_photo_url text,
  pocs jsonb default '[]'::jsonb,
  notes text,
  updated_by uuid,
  updated_at timestamptz default now()
);

alter table public.event_admin_pocs add column if not exists pocs jsonb default '[]'::jsonb;

create table if not exists public.event_contact_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  sender_user_id uuid,
  sender_email text,
  sender_name text,
  message text not null,
  admin_poc_email text,
  recipients text[],
  created_at timestamptz default now()
);

alter table public.event_admin_pocs enable row level security;
alter table public.event_contact_messages enable row level security;

drop policy if exists event_admin_pocs_public_read on public.event_admin_pocs;
drop policy if exists event_admin_pocs_admin_write on public.event_admin_pocs;
drop policy if exists event_contact_messages_admin_read on public.event_contact_messages;
drop policy if exists event_contact_messages_own_read on public.event_contact_messages;

create policy event_admin_pocs_public_read on public.event_admin_pocs for select using (true);

create policy event_admin_pocs_admin_write on public.event_admin_pocs
for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy event_contact_messages_admin_read on public.event_contact_messages
for select to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy event_contact_messages_own_read on public.event_contact_messages
for select to authenticated
using (sender_user_id = auth.uid());
