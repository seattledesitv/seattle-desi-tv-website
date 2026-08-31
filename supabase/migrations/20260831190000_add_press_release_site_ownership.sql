-- Assign press releases to a Desi TV market.

alter table public.press_releases
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.press_releases
set site_id = public.current_site_id('sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.press_releases where site_id is null) then
    raise exception 'Press releases could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.press_releases alter column site_id set not null;
alter table public.press_releases alter column site_id set default public.current_site_id('sea');

create index if not exists press_releases_site_public_idx
  on public.press_releases (site_id, status, release_date desc, published_at desc);
create index if not exists press_releases_site_owner_idx
  on public.press_releases (site_id, created_by, created_at desc);

comment on column public.press_releases.site_id is 'Market that owns and publishes this press release.';
