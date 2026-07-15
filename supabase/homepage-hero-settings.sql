create table if not exists public.homepage_hero_settings (
  id text primary key default 'default',
  layout_style text not null default 'image_focus',
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

insert into public.homepage_hero_settings (id, layout_style)
values ('default', 'image_focus')
on conflict (id) do nothing;

alter table public.homepage_hero_settings enable row level security;

-- Public visitors may read the selected homepage layout.
drop policy if exists "homepage hero settings are publicly readable" on public.homepage_hero_settings;
create policy "homepage hero settings are publicly readable"
on public.homepage_hero_settings
for select
using (true);

-- Authenticated users can write only when they are present in public.admins.
drop policy if exists "admins can manage homepage hero settings" on public.homepage_hero_settings;
create policy "admins can manage homepage hero settings"
on public.homepage_hero_settings
for all
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);
