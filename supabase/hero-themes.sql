-- Selectable homepage hero themes
alter table public.homepage_hero_banners
  add column if not exists theme text not null default 'fallback';

alter table public.festival_hero_assets
  add column if not exists theme text not null default 'festival';

alter table public.homepage_hero_banners
  drop constraint if exists homepage_hero_banners_theme_check;
alter table public.homepage_hero_banners
  add constraint homepage_hero_banners_theme_check
  check (theme in ('fallback','gold','pink','blue','festival','cinematic'));

alter table public.festival_hero_assets
  drop constraint if exists festival_hero_assets_theme_check;
alter table public.festival_hero_assets
  add constraint festival_hero_assets_theme_check
  check (theme in ('fallback','gold','pink','blue','festival','cinematic'));
