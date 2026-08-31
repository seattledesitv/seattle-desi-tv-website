-- Assign marketing and festival homepage heroes to a Desi TV market.

alter table public.homepage_hero_banners
  add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.festival_hero_assets
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.homepage_hero_banners set site_id = public.current_site_id('sea') where site_id is null;
update public.festival_hero_assets set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.homepage_hero_banners where site_id is null)
     or exists (select 1 from public.festival_hero_assets where site_id is null) then
    raise exception 'Homepage hero records could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.homepage_hero_banners alter column site_id set not null;
alter table public.homepage_hero_banners alter column site_id set default public.current_site_id('sea');
alter table public.festival_hero_assets alter column site_id set not null;
alter table public.festival_hero_assets alter column site_id set default public.current_site_id('sea');

create index if not exists homepage_hero_banners_site_public_idx
  on public.homepage_hero_banners (site_id, active, display_order, start_date, end_date);
create index if not exists festival_hero_assets_site_public_idx
  on public.festival_hero_assets (site_id, active, start_date, end_date);

comment on column public.homepage_hero_banners.site_id is 'Market where this homepage banner is displayed.';
comment on column public.festival_hero_assets.site_id is 'Market where this festival hero is displayed.';
