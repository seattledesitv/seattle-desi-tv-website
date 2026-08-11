create or replace function public.is_sdtv_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admins a where a.user_id=auth.uid() and lower(coalesce(a.role,'')) like '%admin%')
$$;

create table if not exists public.matrimony_access_pricing (
  plan_key text primary key default 'standard_access',
  label text not null default 'Matrimony Profile Access',
  description text,
  price_cents integer not null default 2500 check (price_cents >= 0),
  duration_days integer not null default 30 check (duration_days between 1 and 365),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.matrimony_access_pricing(plan_key,label,description,price_cents,duration_days)
values ('standard_access','Matrimony Profile Access','Time-limited access to approved profiles after SDTV reviews the access request.',2500,30)
on conflict (plan_key) do nothing;

create table if not exists public.matrimony_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 100),
  birth_year integer not null check (birth_year between 1900 and 2100),
  gender text not null,
  seeking text not null,
  marital_status text not null,
  religion text,
  community text,
  languages text[] not null default '{}',
  education text,
  occupation text,
  city text not null,
  state_region text,
  country text not null default 'United States',
  about text not null,
  partner_preferences text not null,
  photo_paths text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','pending','changes_requested','approved','on_hold','rejected','archived')),
  admin_notes text,
  consent_confirmed boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id)
);

create table if not exists public.matrimony_profile_contacts (
  profile_id uuid primary key references public.matrimony_profiles(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  preferred_contact text not null default 'email' check (preferred_contact in ('email','phone','either')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matrimony_access_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_email text not null,
  reason text not null check (char_length(trim(reason)) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending','changes_requested','approved_pending_payment','active','rejected','expired','revoked')),
  quoted_price_cents integer check (quoted_price_cents is null or quoted_price_cents >= 0),
  duration_days integer check (duration_days is null or duration_days between 1 and 365),
  payment_status text not null default 'not_requested' check (payment_status in ('not_requested','pending','paid','waived','refunded')),
  payment_link text,
  payment_reference text,
  payment_requested_at timestamptz,
  paid_at timestamptz,
  access_starts_at timestamptz,
  access_expires_at timestamptz,
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists matrimony_one_open_access_request
  on public.matrimony_access_requests(requester_user_id)
  where status in ('pending','changes_requested','approved_pending_payment','active');
create index if not exists matrimony_profiles_review_idx on public.matrimony_profiles(status,created_at desc);
create index if not exists matrimony_access_review_idx on public.matrimony_access_requests(status,created_at desc);

alter table public.matrimony_access_pricing enable row level security;
alter table public.matrimony_profiles enable row level security;
alter table public.matrimony_profile_contacts enable row level security;
alter table public.matrimony_access_requests enable row level security;

create policy "Authenticated users read active matrimony pricing" on public.matrimony_access_pricing for select to authenticated using (active or public.is_sdtv_admin());
create policy "Admins manage matrimony pricing" on public.matrimony_access_pricing for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());

create policy "Owners read own matrimony profile" on public.matrimony_profiles for select to authenticated using (owner_user_id=auth.uid());
create policy "Entitled users read approved matrimony profiles" on public.matrimony_profiles for select to authenticated using (
  status='approved' and exists(select 1 from public.matrimony_access_requests r where r.requester_user_id=auth.uid() and r.status='active' and r.access_starts_at<=now() and r.access_expires_at>now())
);
create policy "Owners create matrimony profile" on public.matrimony_profiles for insert to authenticated with check (owner_user_id=auth.uid() and status in ('draft','pending'));
create policy "Owners update unpublished matrimony profile" on public.matrimony_profiles for update to authenticated using (owner_user_id=auth.uid() and status in ('draft','pending','changes_requested','rejected')) with check (owner_user_id=auth.uid() and status in ('draft','pending'));
create policy "Admins manage matrimony profiles" on public.matrimony_profiles for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());

create policy "Owners read matrimony contact" on public.matrimony_profile_contacts for select to authenticated using (owner_user_id=auth.uid());
create policy "Owners create matrimony contact" on public.matrimony_profile_contacts for insert to authenticated with check (owner_user_id=auth.uid() and exists(select 1 from public.matrimony_profiles p where p.id=profile_id and p.owner_user_id=auth.uid()));
create policy "Owners update matrimony contact" on public.matrimony_profile_contacts for update to authenticated using (owner_user_id=auth.uid()) with check (owner_user_id=auth.uid());
create policy "Admins manage matrimony contacts" on public.matrimony_profile_contacts for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());

create policy "Users read own matrimony access requests" on public.matrimony_access_requests for select to authenticated using (requester_user_id=auth.uid());
create policy "Users create matrimony access requests" on public.matrimony_access_requests for insert to authenticated with check (requester_user_id=auth.uid() and status='pending' and payment_status='not_requested');
create policy "Admins manage matrimony access requests" on public.matrimony_access_requests for all to authenticated using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());

create or replace function public.submit_matrimony_access_request(requester_email_input text, reason_input text)
returns void language plpgsql security definer set search_path=public as $$
declare existing public.matrimony_access_requests%rowtype; verified_email text;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if char_length(trim(reason_input))<20 then raise exception 'Please provide a detailed access reason'; end if;
  verified_email:=coalesce(nullif(auth.jwt()->>'email',''),nullif(trim(requester_email_input),''));
  if verified_email is null then raise exception 'A verified account email is required'; end if;
  select * into existing from public.matrimony_access_requests where requester_user_id=auth.uid() and status in ('pending','changes_requested','approved_pending_payment','active') order by created_at desc limit 1 for update;
  if found then
    if existing.status='changes_requested' or (existing.status='active' and existing.access_expires_at<=now()) then
      update public.matrimony_access_requests set requester_email=verified_email,reason=trim(reason_input),status='pending',quoted_price_cents=null,duration_days=null,payment_status='not_requested',payment_link=null,payment_reference=null,payment_requested_at=null,paid_at=null,access_starts_at=null,access_expires_at=null,admin_notes=null,reviewed_by=null,reviewed_at=null,updated_at=now() where id=existing.id;
    else raise exception 'An access request is already in progress';
    end if;
  else
    insert into public.matrimony_access_requests(requester_user_id,requester_email,reason) values(auth.uid(),verified_email,trim(reason_input));
  end if;
end $$;

create or replace function public.review_matrimony_profile(profile_id uuid, decision text, notes text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_sdtv_admin() then raise exception 'Admin access required'; end if;
  if decision='approve' then update public.matrimony_profiles set status='approved',admin_notes=nullif(trim(notes),''),approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=profile_id;
  elsif decision='changes' then update public.matrimony_profiles set status='changes_requested',admin_notes=nullif(trim(notes),''),updated_at=now() where id=profile_id;
  elsif decision='hold' then update public.matrimony_profiles set status='on_hold',admin_notes=nullif(trim(notes),''),updated_at=now() where id=profile_id;
  elsif decision='reject' then update public.matrimony_profiles set status='rejected',admin_notes=nullif(trim(notes),''),updated_at=now() where id=profile_id;
  elsif decision='archive' then update public.matrimony_profiles set status='archived',admin_notes=nullif(trim(notes),''),updated_at=now() where id=profile_id;
  else raise exception 'Invalid profile decision'; end if;
end $$;

create or replace function public.review_matrimony_access(request_id uuid, decision text, final_price_cents integer default null, final_duration_days integer default null, notes text default null, pay_url text default null)
returns void language plpgsql security definer set search_path=public as $$
declare pricing public.matrimony_access_pricing%rowtype; amount integer; days integer;
begin
  if not public.is_sdtv_admin() then raise exception 'Admin access required'; end if;
  select * into pricing from public.matrimony_access_pricing where plan_key='standard_access';
  amount:=coalesce(final_price_cents,pricing.price_cents); days:=coalesce(final_duration_days,pricing.duration_days);
  if decision='approve' then
    update public.matrimony_access_requests set quoted_price_cents=amount,duration_days=days,payment_status=case when amount=0 then 'waived' else 'pending' end,status=case when amount=0 then 'active' else 'approved_pending_payment' end,payment_link=nullif(trim(pay_url),''),payment_requested_at=case when amount>0 then now() end,access_starts_at=case when amount=0 then now() end,access_expires_at=case when amount=0 then now()+(days||' days')::interval end,reviewed_by=auth.uid(),reviewed_at=now(),admin_notes=nullif(trim(notes),''),updated_at=now() where id=request_id;
  elsif decision='changes' then update public.matrimony_access_requests set status='changes_requested',admin_notes=nullif(trim(notes),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=request_id;
  elsif decision='reject' then update public.matrimony_access_requests set status='rejected',admin_notes=nullif(trim(notes),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=request_id;
  elsif decision='revoke' then update public.matrimony_access_requests set status='revoked',access_expires_at=now(),admin_notes=nullif(trim(notes),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=request_id;
  else raise exception 'Invalid access decision'; end if;
end $$;

create or replace function public.complete_matrimony_access_payment(request_id uuid, reference text default null)
returns void language plpgsql security definer set search_path=public as $$
declare req public.matrimony_access_requests%rowtype;
begin
  if not public.is_sdtv_admin() then raise exception 'Admin access required'; end if;
  select * into req from public.matrimony_access_requests where id=request_id for update;
  if req.status<>'approved_pending_payment' or req.payment_status<>'pending' then raise exception 'Request is not awaiting payment'; end if;
  update public.matrimony_access_requests set status='active',payment_status='paid',payment_reference=nullif(trim(reference),''),paid_at=now(),access_starts_at=now(),access_expires_at=now()+(req.duration_days||' days')::interval,updated_at=now() where id=request_id;
end $$;

grant execute on function public.review_matrimony_profile(uuid,text,text) to authenticated;
grant execute on function public.review_matrimony_access(uuid,text,integer,integer,text,text) to authenticated;
grant execute on function public.complete_matrimony_access_payment(uuid,text) to authenticated;
grant execute on function public.submit_matrimony_access_request(text,text) to authenticated;

insert into storage.buckets(id,name,public) values('matrimony-profile-images','matrimony-profile-images',false) on conflict(id) do update set public=false;
create policy "Owners upload matrimony profile images" on storage.objects for insert to authenticated with check (bucket_id='matrimony-profile-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Owners and entitled members read matrimony profile images" on storage.objects for select to authenticated using (
  bucket_id='matrimony-profile-images' and (
    (storage.foldername(name))[1]=auth.uid()::text or public.is_sdtv_admin() or exists(
      select 1 from public.matrimony_profiles p where name=any(p.photo_paths) and p.status='approved' and exists(select 1 from public.matrimony_access_requests r where r.requester_user_id=auth.uid() and r.status='active' and r.access_expires_at>now())
    )
  )
);
create policy "Owners delete matrimony profile images" on storage.objects for delete to authenticated using (bucket_id='matrimony-profile-images' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_sdtv_admin()));

comment on table public.matrimony_profiles is 'Moderated matrimony profiles visible only to owners, admins, and active paid-access members.';
comment on table public.matrimony_profile_contacts is 'Private contact data isolated from paid profile browsing; SDTV facilitates introductions.';
