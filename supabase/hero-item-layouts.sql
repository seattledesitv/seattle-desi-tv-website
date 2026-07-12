-- Per-item homepage hero layouts.
-- Safe to run more than once.

alter table if exists public.homepage_hero_banners
  add column if not exists hero_layout text not null default 'inherit';

alter table if exists public.festival_hero_assets
  add column if not exists hero_layout text not null default 'inherit';

alter table if exists public.events
  add column if not exists hero_layout text not null default 'inherit';

update public.homepage_hero_banners set hero_layout = 'inherit' where hero_layout is null or btrim(hero_layout) = '';
update public.festival_hero_assets set hero_layout = 'inherit' where hero_layout is null or btrim(hero_layout) = '';
update public.events set hero_layout = 'inherit' where hero_layout is null or btrim(hero_layout) = '';

comment on column public.homepage_hero_banners.hero_layout is 'inherit or a supported homepage hero layout key';
comment on column public.festival_hero_assets.hero_layout is 'inherit or a supported homepage hero layout key';
comment on column public.events.hero_layout is 'inherit or a supported homepage hero layout key';
