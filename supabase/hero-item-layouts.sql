-- Per-item homepage hero layout overrides.
-- Existing records inherit the global homepage hero layout.

alter table if exists public.homepage_hero_banners
  add column if not exists hero_layout text not null default 'inherit';

alter table if exists public.festival_hero_assets
  add column if not exists hero_layout text not null default 'inherit';

alter table if exists public.events
  add column if not exists hero_layout text not null default 'inherit';

comment on column public.homepage_hero_banners.hero_layout is 'Hero layout override; inherit uses homepage_hero_settings.layout_style.';
comment on column public.festival_hero_assets.hero_layout is 'Hero layout override; inherit uses homepage_hero_settings.layout_style.';
comment on column public.events.hero_layout is 'Hero layout override; inherit uses homepage_hero_settings.layout_style.';

-- Keep values constrained to layouts supported by the application.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_hero_banners_hero_layout_check') then
    alter table public.homepage_hero_banners add constraint homepage_hero_banners_hero_layout_check
      check (hero_layout in ('inherit','image_focus','classic','premium','cinematic','split_right','split_left','spotlight','minimal'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'festival_hero_assets_hero_layout_check') then
    alter table public.festival_hero_assets add constraint festival_hero_assets_hero_layout_check
      check (hero_layout in ('inherit','image_focus','classic','premium','cinematic','split_right','split_left','spotlight','minimal'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_hero_layout_check') then
    alter table public.events add constraint events_hero_layout_check
      check (hero_layout in ('inherit','image_focus','classic','premium','cinematic','split_right','split_left','spotlight','minimal'));
  end if;
end $$;
