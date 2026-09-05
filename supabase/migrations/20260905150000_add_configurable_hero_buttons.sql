-- Allow every managed homepage hero to define zero to three custom action buttons.

alter table if exists public.homepage_hero_banners
  add column if not exists hero_buttons jsonb;
alter table if exists public.festival_hero_assets
  add column if not exists hero_buttons jsonb;
alter table if exists public.events
  add column if not exists hero_buttons jsonb;

comment on column public.homepage_hero_banners.hero_buttons is 'Optional ordered hero actions: [{label,url,style}]. Null preserves legacy defaults; [] hides every button.';
comment on column public.festival_hero_assets.hero_buttons is 'Optional ordered hero actions: [{label,url,style}]. Null preserves legacy defaults; [] hides every button.';
comment on column public.events.hero_buttons is 'Optional ordered hero actions: [{label,url,style}]. Null preserves legacy defaults; [] hides every button.';
