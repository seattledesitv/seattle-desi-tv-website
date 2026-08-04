alter table public.business_offers
  add column if not exists requested_placement text not null default 'standard',
  add column if not exists is_homepage_hero boolean not null default false,
  add column if not exists homepage_rank integer not null default 100,
  add column if not exists quoted_price_cents integer;

alter table public.business_offers
  drop constraint if exists business_offers_requested_placement_check,
  drop constraint if exists business_offers_homepage_rank_check,
  drop constraint if exists business_offers_quoted_price_check;

alter table public.business_offers
  add constraint business_offers_requested_placement_check
    check (requested_placement in ('standard', 'premium', 'featured', 'hero')),
  add constraint business_offers_homepage_rank_check
    check (homepage_rank between 0 and 9999),
  add constraint business_offers_quoted_price_check
    check (quoted_price_cents is null or quoted_price_cents >= 0);

create index if not exists business_offers_homepage_hero_idx
  on public.business_offers (is_homepage_hero desc, homepage_rank)
  where status = 'approved';

drop policy if exists "business owners create offers" on public.business_offers;
create policy "business owners create offers" on public.business_offers for insert to authenticated
with check (
  created_by = auth.uid()
  and status in ('draft','pending')
  and requested_placement in ('standard','premium','featured','hero')
  and not is_premium and not is_featured and not is_homepage_hero
  and payment_status = 'unpaid' and quoted_price_cents is null
  and (
    exists (select 1 from public.local_businesses b where b.id = business_id and b.created_by = auth.uid())
    or exists (select 1 from public.business_managers m where m.business_id = business_id and m.user_id = auth.uid() and m.active)
  )
);

drop policy if exists "business owners update unapproved offers" on public.business_offers;
create policy "business owners update unapproved offers" on public.business_offers for update to authenticated
using ((created_by = auth.uid() or exists (select 1 from public.business_managers m where m.business_id = business_offers.business_id and m.user_id = auth.uid() and m.active)) and status in ('draft','pending','rejected'))
with check (created_by = auth.uid() and status in ('draft','pending') and requested_placement in ('standard','premium','featured','hero') and not is_premium and not is_featured and not is_homepage_hero and payment_status = 'unpaid' and quoted_price_cents is null);

comment on column public.business_offers.requested_placement is 'Placement tier requested by the business owner; SDTV approval controls the corresponding display flags.';
comment on column public.business_offers.is_homepage_hero is 'Admin-controlled placement in the homepage hero carousel.';
comment on column public.business_offers.quoted_price_cents is 'SDTV-approved price snapshot in cents for the requested placement; null until quoted.';
