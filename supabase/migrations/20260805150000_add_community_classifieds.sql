create table if not exists public.classified_pricing (
  placement text primary key check (placement in ('standard','featured','homepage')),
  label text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  duration_days integer not null default 30 check (duration_days between 1 and 365),
  active boolean not null default true,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.classified_pricing(placement,label,description,price_cents,duration_days,display_order) values
  ('standard','Standard','Listed in the community classifieds directory.',0,30,10),
  ('featured','Featured','Shown before standard listings with a featured badge.',1500,30,20),
  ('homepage','Homepage','Featured placement plus eligibility for homepage promotion.',3500,14,30)
on conflict (placement) do nothing;

create table if not exists public.classified_ads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('items','housing','jobs','services','vehicles','community','classes','lost_found','other')),
  title text not null,
  description text not null,
  price_cents integer check (price_cents is null or price_cents >= 0),
  price_type text not null default 'fixed' check (price_type in ('fixed','negotiable','free','contact')),
  item_condition text check (item_condition is null or item_condition in ('new','like_new','good','fair','not_applicable')),
  location text not null,
  image_urls text[] not null default '{}',
  contact_name text not null,
  contact_email text,
  contact_phone text,
  contact_method text not null default 'form' check (contact_method in ('form','email','phone','external')),
  destination_url text,
  requested_placement text not null default 'standard' references public.classified_pricing(placement),
  status text not null default 'draft' check (status in ('draft','pending','changes_requested','approved_pending_payment','active','sold','filled','expired','rejected','suspended','removed')),
  quoted_price_cents integer check (quoted_price_cents is null or quoted_price_cents >= 0),
  payment_status text not null default 'not_required' check (payment_status in ('not_required','pending','paid','waived','refunded')),
  payment_reference text,
  payment_link text,
  payment_requested_at timestamptz,
  paid_at timestamptz,
  starts_at timestamptz,
  expires_at timestamptz,
  admin_notes text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classified_reports (
  id uuid primary key default gen_random_uuid(),
  classified_id uuid not null references public.classified_ads(id) on delete cascade,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reporter_email text,
  reason text not null check (reason in ('scam','prohibited','duplicate','inaccurate','sold','other')),
  details text,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed','actioned')),
  created_at timestamptz not null default now()
);

create table if not exists public.classified_activity_log (
  id uuid primary key default gen_random_uuid(),
  classified_id uuid not null references public.classified_ads(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists classified_ads_public_idx on public.classified_ads(status, requested_placement, expires_at, created_at desc);
create index if not exists classified_ads_owner_idx on public.classified_ads(created_by, created_at desc);
create index if not exists classified_reports_review_idx on public.classified_reports(status, created_at desc);

alter table public.classified_pricing enable row level security;
alter table public.classified_ads enable row level security;
alter table public.classified_reports enable row level security;
alter table public.classified_activity_log enable row level security;

create policy "Public reads classified pricing" on public.classified_pricing for select to anon, authenticated using (active);
create policy "Admins manage classified pricing" on public.classified_pricing for all to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%')) with check (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%'));
create policy "Public reads active classifieds" on public.classified_ads for select to anon, authenticated using (status='active' and starts_at <= now() and expires_at > now());
create policy "Owners read classifieds" on public.classified_ads for select to authenticated using (created_by=auth.uid());
create policy "Owners create classifieds" on public.classified_ads for insert to authenticated with check (created_by=auth.uid() and status in ('draft','pending') and payment_status='not_required');
create policy "Owners update unpublished classifieds" on public.classified_ads for update to authenticated using (created_by=auth.uid() and status in ('draft','pending','changes_requested','rejected')) with check (created_by=auth.uid() and status in ('draft','pending'));
create policy "Owners close active classifieds" on public.classified_ads for update to authenticated using (created_by=auth.uid() and status='active') with check (created_by=auth.uid() and status in ('sold','filled'));
create policy "Admins manage classifieds" on public.classified_ads for all to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%')) with check (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%'));
create policy "Authenticated users report classifieds" on public.classified_reports for insert to authenticated with check (reporter_user_id=auth.uid());
create policy "Reporters read own reports" on public.classified_reports for select to authenticated using (reporter_user_id=auth.uid());
create policy "Admins manage classified reports" on public.classified_reports for all to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%')) with check (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%'));
create policy "Owners read classified activity" on public.classified_activity_log for select to authenticated using (exists(select 1 from public.classified_ads c where c.id=classified_id and c.created_by=auth.uid()));
create policy "Admins manage classified activity" on public.classified_activity_log for all to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%')) with check (exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%'));

create or replace function public.review_classified(classified_id uuid, decision text, requested_placement_input text, final_price_cents integer, review_notes text default null) returns void language plpgsql security definer set search_path=public as $$
declare ad public.classified_ads%rowtype; price public.classified_pricing%rowtype;
begin
  if not exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(a.role) like '%admin%') then raise exception 'Admin access required'; end if;
  select * into ad from public.classified_ads where id=classified_id for update; if not found then raise exception 'Classified not found'; end if;
  if decision='approve' then
    select * into price from public.classified_pricing where classified_pricing.placement=requested_placement_input and active;
    if not found then raise exception 'Placement pricing is not active'; end if;
    update public.classified_ads set requested_placement=requested_placement_input, quoted_price_cents=coalesce(final_price_cents,price.price_cents), payment_status=case when coalesce(final_price_cents,price.price_cents)=0 then 'waived' else 'pending' end, status=case when coalesce(final_price_cents,price.price_cents)=0 then 'active' else 'approved_pending_payment' end, starts_at=case when coalesce(final_price_cents,price.price_cents)=0 then now() else null end, expires_at=case when coalesce(final_price_cents,price.price_cents)=0 then now()+(price.duration_days||' days')::interval else null end, payment_requested_at=case when coalesce(final_price_cents,price.price_cents)>0 then now() else null end, approved_by=auth.uid(),approved_at=now(),admin_notes=nullif(trim(review_notes),''),updated_at=now() where id=classified_id;
  elsif decision='changes' then update public.classified_ads set status='changes_requested',admin_notes=nullif(trim(review_notes),''),updated_at=now() where id=classified_id;
  elsif decision='reject' then update public.classified_ads set status='rejected',admin_notes=nullif(trim(review_notes),''),updated_at=now() where id=classified_id;
  else raise exception 'Invalid decision'; end if;
  insert into public.classified_activity_log(classified_id,actor_user_id,action,details) values(classified_id,auth.uid(),decision,jsonb_build_object('placement',requested_placement_input,'price_cents',final_price_cents,'notes',review_notes));
end $$;
revoke all on function public.review_classified(uuid,text,text,integer,text) from public;
grant execute on function public.review_classified(uuid,text,text,integer,text) to authenticated;

comment on table public.classified_ads is 'Moderated, expiring community classified advertisements with approval-first payment plumbing.';
