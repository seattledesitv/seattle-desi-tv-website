-- Community directory tables for SDTV
-- Run this in Supabase SQL editor before using the Community Groups / Organizations pages.

create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text,
  category text,
  language text,
  location text,
  description text,
  group_url text,
  contact_name text,
  contact_email text,
  contact_phone text,
  submitted_by uuid references auth.users(id),
  submitted_email text,
  status text not null default 'pending' check (status in ('pending','approved','on_hold','rejected')),
  approved boolean not null default false,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type text,
  category text,
  location text,
  website text,
  description text,
  contact_name text,
  contact_email text,
  contact_phone text,
  submitted_by uuid references auth.users(id),
  submitted_email text,
  status text not null default 'pending' check (status in ('pending','approved','on_hold','rejected')),
  approved boolean not null default false,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_groups_status_created_idx on public.community_groups(status, created_at desc);
create index if not exists community_orgs_status_created_idx on public.community_organizations(status, created_at desc);

alter table public.community_groups enable row level security;
alter table public.community_organizations enable row level security;

-- Public can read only approved listings.
drop policy if exists "Community groups approved public read" on public.community_groups;
create policy "Community groups approved public read" on public.community_groups for select using (status = 'approved' and approved = true);

drop policy if exists "Community orgs approved public read" on public.community_organizations;
create policy "Community orgs approved public read" on public.community_organizations for select using (status = 'approved' and approved = true);

-- Logged-in users can submit new listings for approval.
drop policy if exists "Logged in users submit community groups" on public.community_groups;
create policy "Logged in users submit community groups" on public.community_groups for insert to authenticated with check (auth.uid() = submitted_by and status = 'pending' and approved = false);

drop policy if exists "Logged in users submit community orgs" on public.community_organizations;
create policy "Logged in users submit community orgs" on public.community_organizations for insert to authenticated with check (auth.uid() = submitted_by and status = 'pending' and approved = false);

-- Submitters can view their own pending/rejected records.
drop policy if exists "Submitters read own community groups" on public.community_groups;
create policy "Submitters read own community groups" on public.community_groups for select to authenticated using (auth.uid() = submitted_by);

drop policy if exists "Submitters read own community orgs" on public.community_organizations;
create policy "Submitters read own community orgs" on public.community_organizations for select to authenticated using (auth.uid() = submitted_by);

-- Admins can manage all records. This matches existing SDTV admin role table.
drop policy if exists "Admins manage community groups" on public.community_groups;
create policy "Admins manage community groups" on public.community_groups for all to authenticated using (
  exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%')
) with check (
  exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%')
);

drop policy if exists "Admins manage community orgs" on public.community_organizations;
create policy "Admins manage community orgs" on public.community_organizations for all to authenticated using (
  exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%')
) with check (
  exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%')
);
