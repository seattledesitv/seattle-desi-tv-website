-- Separate business promotions and their pricing configuration by market.

alter table public.business_offers add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.business_offer_pricing add column if not exists site_id uuid references public.sites(id) on delete cascade;

update public.business_offers child
set site_id = parent.site_id
from public.local_businesses parent
where child.business_id = parent.id and child.site_id is null;

update public.business_offers set site_id = public.current_site_id('sea') where site_id is null;
update public.business_offer_pricing set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.business_offers where site_id is null)
     or exists (select 1 from public.business_offer_pricing where site_id is null) then
    raise exception 'Business offer records could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.business_offers alter column site_id set not null;
alter table public.business_offers alter column site_id set default public.current_site_id('sea');
alter table public.business_offer_pricing alter column site_id set not null;
alter table public.business_offer_pricing alter column site_id set default public.current_site_id('sea');

alter table public.business_offer_pricing drop constraint if exists business_offer_pricing_pkey;
alter table public.business_offer_pricing add constraint business_offer_pricing_pkey primary key (site_id, placement);

insert into public.business_offer_pricing (site_id, placement, label, description, display_order)
select s.id, defaults.placement, defaults.label, defaults.description, defaults.display_order
from public.sites s
cross join (values
  ('standard', 'Standard', 'Listed with all approved offers.', 10),
  ('premium', 'Premium', 'Enhanced priority card in the regular offers list.', 20),
  ('featured', 'Featured', 'Pinned in the featured section at the top of Offers.', 30),
  ('hero', 'Homepage Hero', 'Promoted in the homepage hero carousel.', 40)
) as defaults(placement, label, description, display_order)
on conflict (site_id, placement) do nothing;

create or replace function public.set_business_offer_site_id()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.business_id is not null then
    select site_id into new.site_id from public.local_businesses where id = new.business_id;
  end if;
  if new.site_id is null then new.site_id := public.current_site_id('sea'); end if;
  return new;
end
$$;

drop trigger if exists set_business_offer_site on public.business_offers;
create trigger set_business_offer_site before insert or update of business_id, site_id
on public.business_offers for each row execute function public.set_business_offer_site_id();

create index if not exists business_offers_site_status_idx on public.business_offers (site_id, status, starts_at, ends_at);
create index if not exists business_offer_pricing_site_active_idx on public.business_offer_pricing (site_id, active, display_order);

comment on column public.business_offers.site_id is 'Market inherited from the selected business, or explicitly selected for direct advertisers.';
comment on column public.business_offer_pricing.site_id is 'Market-specific offer placement pricing.';
