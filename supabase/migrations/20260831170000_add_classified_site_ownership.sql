-- Assign community classifieds to a Desi TV market.

alter table public.classified_ads
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.classified_ads
set site_id = public.current_site_id('sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.classified_ads where site_id is null) then
    raise exception 'Classified ads could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.classified_ads alter column site_id set not null;
alter table public.classified_ads alter column site_id set default public.current_site_id('sea');

create index if not exists classified_ads_site_public_idx
  on public.classified_ads (site_id, status, requested_placement, expires_at, created_at desc);
create index if not exists classified_ads_site_owner_idx
  on public.classified_ads (site_id, created_by, created_at desc);

comment on column public.classified_ads.site_id is 'Market that owns and publishes this classified ad.';
