-- Give each market independent sponsorship packages and agreements.
-- Installments and agreement events inherit ownership from their agreement.

alter table public.sponsorship_package_templates
  add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.sponsorship_agreements
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.sponsorship_package_templates set site_id = public.current_site_id('sea') where site_id is null;
update public.sponsorship_agreements set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.sponsorship_package_templates where site_id is null)
     or exists (select 1 from public.sponsorship_agreements where site_id is null) then
    raise exception 'Sponsorship records could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.sponsorship_package_templates alter column site_id set not null;
alter table public.sponsorship_package_templates alter column site_id set default public.current_site_id('sea');
alter table public.sponsorship_agreements alter column site_id set not null;
alter table public.sponsorship_agreements alter column site_id set default public.current_site_id('sea');

alter table public.sponsorship_package_templates drop constraint if exists sponsorship_package_templates_tier_key;
alter table public.sponsorship_package_templates
  add constraint sponsorship_package_templates_site_tier_key unique (site_id, tier);

create index if not exists sponsorship_packages_site_order_idx
  on public.sponsorship_package_templates (site_id, active, display_order);
create index if not exists sponsorship_agreements_site_status_created_idx
  on public.sponsorship_agreements (site_id, status, created_at desc);

insert into public.sponsorship_package_templates
  (site_id, tier, name, price_cents, benefits, agreement_template, active, display_order)
select
  target.id,
  source.tier,
  source.name,
  source.price_cents,
  source.benefits,
  replace(
    replace(source.agreement_template, 'Seattle Desi TV', target.name),
    'info@seattledesitv.com',
    coalesce(target.settings->>'zelle_recipient', 'info@seattledesitv.com')
  ),
  source.active,
  source.display_order
from public.sites target
join public.sites seattle on seattle.code = 'sea'
join public.sponsorship_package_templates source on source.site_id = seattle.id
on conflict (site_id, tier) do nothing;

comment on column public.sponsorship_package_templates.site_id is 'Market that offers this sponsorship package.';
comment on column public.sponsorship_agreements.site_id is 'Market that owns this sponsorship agreement and its dependent records.';
