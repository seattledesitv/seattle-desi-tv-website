create table if not exists public.business_offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.local_businesses(id) on delete cascade,
  title text not null,
  description text,
  terms text,
  offer_code text,
  destination_url text,
  image_url text,
  starts_at date not null default current_date,
  ends_at date,
  status text not null default 'pending' check (status in ('draft','pending','approved','rejected','expired')),
  is_premium boolean not null default false,
  premium_rank integer not null default 100 check (premium_rank between 0 and 9999),
  is_featured boolean not null default false,
  featured_rank integer not null default 100 check (featured_rank between 0 and 9999),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','waived','refunded')),
  payment_reference text,
  created_by uuid not null references auth.users(id) on delete cascade,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_offers_date_range_check check (ends_at is null or ends_at >= starts_at)
);

create index if not exists business_offers_public_idx on public.business_offers (status, starts_at, ends_at);
create index if not exists business_offers_placement_idx on public.business_offers (is_featured desc, featured_rank, is_premium desc, premium_rank);
create index if not exists business_offers_business_idx on public.business_offers (business_id, created_at desc);

alter table public.business_offers enable row level security;

drop policy if exists "public reads active approved business offers" on public.business_offers;
create policy "public reads active approved business offers" on public.business_offers for select to anon, authenticated
using (status = 'approved' and starts_at <= current_date and (ends_at is null or ends_at >= current_date));

drop policy if exists "business owners read own offers" on public.business_offers;
create policy "business owners read own offers" on public.business_offers for select to authenticated
using (created_by = auth.uid() or exists (select 1 from public.business_managers m where m.business_id = business_offers.business_id and m.user_id = auth.uid() and m.active));

drop policy if exists "business owners create offers" on public.business_offers;
create policy "business owners create offers" on public.business_offers for insert to authenticated
with check (created_by = auth.uid() and status in ('draft','pending') and not is_premium and not is_featured and payment_status = 'unpaid' and (exists (select 1 from public.local_businesses b where b.id = business_id and b.created_by = auth.uid()) or exists (select 1 from public.business_managers m where m.business_id = business_id and m.user_id = auth.uid() and m.active)));

drop policy if exists "business owners update unapproved offers" on public.business_offers;
create policy "business owners update unapproved offers" on public.business_offers for update to authenticated
using ((created_by = auth.uid() or exists (select 1 from public.business_managers m where m.business_id = business_offers.business_id and m.user_id = auth.uid() and m.active)) and status in ('draft','pending','rejected'))
with check (created_by = auth.uid() and status in ('draft','pending') and not is_premium and not is_featured and payment_status = 'unpaid');

drop policy if exists "business owners delete unapproved offers" on public.business_offers;
create policy "business owners delete unapproved offers" on public.business_offers for delete to authenticated
using ((created_by = auth.uid() or exists (select 1 from public.business_managers m where m.business_id = business_offers.business_id and m.user_id = auth.uid() and m.active)) and status in ('draft','pending','rejected'));

drop policy if exists "admins manage business offers" on public.business_offers;
create policy "admins manage business offers" on public.business_offers for all to authenticated
using (exists (select 1 from public.admins a where (a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%'))
with check (exists (select 1 from public.admins a where (a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%'));

comment on table public.business_offers is 'Time-bound business promotions with approval, paid placement, and homepage-feature plumbing.';
comment on column public.business_offers.payment_reference is 'Manual invoice or future payment-provider reference; never displayed publicly.';
