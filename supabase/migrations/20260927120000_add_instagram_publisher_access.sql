create table if not exists public.instagram_publisher_access (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint instagram_publisher_access_identity_check check (user_id is not null or nullif(trim(email), '') is not null)
);

create unique index if not exists instagram_publisher_access_site_user_unique
  on public.instagram_publisher_access (site_id, user_id)
  where user_id is not null;
create unique index if not exists instagram_publisher_access_site_email_unique
  on public.instagram_publisher_access (site_id, lower(email))
  where email is not null;
create index if not exists instagram_publisher_access_site_idx
  on public.instagram_publisher_access (site_id, created_at desc);

alter table public.instagram_publisher_access enable row level security;

drop policy if exists "Users read own Instagram publisher access" on public.instagram_publisher_access;
create policy "Users read own Instagram publisher access"
  on public.instagram_publisher_access for select to authenticated
  using (
    user_id = auth.uid()
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
    or public.sdtv_is_admin()
  );

drop policy if exists "Admins manage Instagram publisher access" on public.instagram_publisher_access;
create policy "Admins manage Instagram publisher access"
  on public.instagram_publisher_access for all to authenticated
  using (public.sdtv_is_admin())
  with check (public.sdtv_is_admin());

comment on table public.instagram_publisher_access is 'Site-scoped team access to the Instagram publishing workspace.';
