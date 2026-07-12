-- Global homepage hero presentation settings.
-- Safe to run multiple times.

create table if not exists public.homepage_hero_settings (
  id text primary key default 'default',
  layout_style text not null default 'image_focus'
    check (layout_style in ('image_focus', 'classic', 'premium', 'cinematic')),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.homepage_hero_settings (id, layout_style)
values ('default', 'image_focus')
on conflict (id) do nothing;

alter table public.homepage_hero_settings enable row level security;

drop policy if exists "homepage hero settings public read" on public.homepage_hero_settings;
create policy "homepage hero settings public read"
on public.homepage_hero_settings
for select
to anon, authenticated
using (true);

drop policy if exists "homepage hero settings admin write" on public.homepage_hero_settings;
create policy "homepage hero settings admin write"
on public.homepage_hero_settings
for all
to authenticated
using (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email'))
      and lower(a.role) in ('admin', 'super_admin', 'pm_admin')
  )
)
with check (
  exists (
    select 1 from public.admins a
    where (a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt() ->> 'email'))
      and lower(a.role) in ('admin', 'super_admin', 'pm_admin')
  )
);
