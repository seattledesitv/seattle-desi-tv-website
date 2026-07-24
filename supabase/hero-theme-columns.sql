-- Hero theme support for existing homepage content.
-- Safe to run multiple times.

alter table if exists public.homepage_hero_banners
  add column if not exists theme text not null default 'fallback';

alter table if exists public.festival_hero_assets
  add column if not exists theme text not null default 'festival';

alter table if exists public.events
  add column if not exists hero_theme text not null default 'fallback';

-- Normalize any legacy null values before the columns are used by Studio.
update public.homepage_hero_banners
set theme = 'fallback'
where theme is null or btrim(theme) = '';

update public.festival_hero_assets
set theme = 'festival'
where theme is null or btrim(theme) = '';

update public.events
set hero_theme = 'fallback'
where hero_theme is null or btrim(hero_theme) = '';
