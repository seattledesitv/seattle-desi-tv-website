alter table public.business_offers alter column business_id drop not null;
alter table public.business_offers add column if not exists advertiser_name text, add column if not exists advertiser_email text, add column if not exists payment_link text, add column if not exists payment_requested_at timestamptz, add column if not exists paid_at timestamptz;
alter table public.business_offers drop constraint if exists business_offers_status_check;
alter table public.business_offers add constraint business_offers_status_check check (status in ('draft','pending','approved_pending_payment','approved','rejected','expired'));
alter table public.business_offers drop constraint if exists business_offers_advertiser_check;
alter table public.business_offers add constraint business_offers_advertiser_check check (business_id is not null or length(trim(coalesce(advertiser_name, ''))) >= 2);

create table if not exists public.business_offer_pricing (placement text primary key check (placement in ('standard','premium','featured','hero')), label text not null, description text not null, price_cents integer not null default 0 check (price_cents >= 0), active boolean not null default true, display_order integer not null default 100, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null);
insert into public.business_offer_pricing (placement,label,description,display_order) values ('standard','Standard','Listed with all approved offers.',10),('premium','Premium','Enhanced priority card in the regular offers list.',20),('featured','Featured','Pinned in the featured section at the top of Offers.',30),('hero','Homepage Hero','Promoted in the homepage hero carousel.',40) on conflict (placement) do nothing;
alter table public.business_offer_pricing enable row level security;
create policy "anyone reads active offer pricing" on public.business_offer_pricing for select to anon, authenticated using (active or exists(select 1 from public.admins a where a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')));
create policy "admins manage offer pricing" on public.business_offer_pricing for all to authenticated using (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%')) with check (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%'));

drop policy if exists "business owners create offers" on public.business_offers;
create policy "business owners create offers" on public.business_offers for insert to authenticated with check (created_by = auth.uid() and status in ('draft','pending') and requested_placement in ('standard','premium','featured','hero') and not is_premium and not is_featured and not is_homepage_hero and payment_status = 'unpaid' and quoted_price_cents is null and payment_link is null and ((business_id is null and length(trim(coalesce(advertiser_name, ''))) >= 2) or exists (select 1 from public.local_businesses b where b.id = business_id and b.created_by = auth.uid()) or exists (select 1 from public.business_managers m where m.business_id = business_id and m.user_id = auth.uid() and m.active)));

comment on table public.business_offer_pricing is 'Admin-configurable offer placement prices. The selected price is copied to each offer when approved.';
comment on column public.business_offers.payment_link is 'Provider-generated or manually supplied checkout URL sent after editorial approval.';
