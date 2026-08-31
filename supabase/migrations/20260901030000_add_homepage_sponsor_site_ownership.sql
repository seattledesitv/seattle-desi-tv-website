-- Assign homepage sponsors and contributors to a Desi TV market.

alter table public.homepage_sponsors
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.homepage_sponsors sponsor
set site_id = business.site_id
from public.local_businesses business
where sponsor.business_id = business.id
  and sponsor.site_id is null
  and business.site_id is not null;

update public.homepage_sponsors
set site_id = public.current_site_id('sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.homepage_sponsors where site_id is null) then
    raise exception 'Homepage sponsors could not be assigned to a site.';
  end if;
end
$$;

alter table public.homepage_sponsors alter column site_id set not null;
alter table public.homepage_sponsors alter column site_id set default public.current_site_id('sea');

create index if not exists homepage_sponsors_site_public_idx
  on public.homepage_sponsors (site_id, active, display_order, name);

create or replace function public.ensure_homepage_sponsor_business_site()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.business_id is not null and not exists (
    select 1 from public.local_businesses business
    where business.id = new.business_id and business.site_id = new.site_id
  ) then
    raise exception 'A homepage sponsor and linked business must belong to the same site.';
  end if;
  return new;
end;
$$;

drop trigger if exists homepage_sponsors_business_site_guard on public.homepage_sponsors;
create trigger homepage_sponsors_business_site_guard
before insert or update of site_id, business_id on public.homepage_sponsors
for each row execute function public.ensure_homepage_sponsor_business_site();

comment on column public.homepage_sponsors.site_id is 'Market where this sponsor or contributor is displayed.';
