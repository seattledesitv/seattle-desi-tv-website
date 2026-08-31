-- Assign private matrimony profiles and access grants to a Desi TV market.

alter table public.matrimony_profiles
  add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.matrimony_access_requests
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.matrimony_profiles set site_id = public.current_site_id('sea') where site_id is null;
update public.matrimony_access_requests set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.matrimony_profiles where site_id is null)
     or exists (select 1 from public.matrimony_access_requests where site_id is null) then
    raise exception 'Matrimony records could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.matrimony_profiles alter column site_id set not null;
alter table public.matrimony_profiles alter column site_id set default public.current_site_id('sea');
alter table public.matrimony_access_requests alter column site_id set not null;
alter table public.matrimony_access_requests alter column site_id set default public.current_site_id('sea');

alter table public.matrimony_profiles
  drop constraint if exists matrimony_profiles_owner_user_id_key;
create unique index if not exists matrimony_one_profile_per_owner_per_site
  on public.matrimony_profiles(site_id, owner_user_id);

drop index if exists public.matrimony_one_open_access_request;
create unique index if not exists matrimony_one_open_access_request_per_site
  on public.matrimony_access_requests(site_id, requester_user_id)
  where status in ('pending','changes_requested','approved_pending_payment','active');
create index if not exists matrimony_profiles_site_review_idx
  on public.matrimony_profiles(site_id,status,created_at desc);
create index if not exists matrimony_access_site_review_idx
  on public.matrimony_access_requests(site_id,status,created_at desc);

drop policy if exists "Entitled users read approved matrimony profiles" on public.matrimony_profiles;
create policy "Entitled users read approved matrimony profiles"
  on public.matrimony_profiles for select to authenticated using (
    status='approved' and exists(
      select 1 from public.matrimony_access_requests r
      where r.requester_user_id=auth.uid()
        and r.site_id=matrimony_profiles.site_id
        and r.status='active'
        and r.access_starts_at<=now()
        and r.access_expires_at>now()
    )
  );

drop function if exists public.submit_matrimony_access_request(text,text);
create function public.submit_matrimony_access_request(requester_email_input text, reason_input text, site_id_input uuid)
returns void language plpgsql security definer set search_path=public as $$
declare existing public.matrimony_access_requests%rowtype; verified_email text;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if not exists(select 1 from public.sites where id=site_id_input and status='active') then raise exception 'Active site required'; end if;
  if char_length(trim(reason_input))<20 then raise exception 'Please provide a detailed access reason'; end if;
  verified_email:=coalesce(nullif(auth.jwt()->>'email',''),nullif(trim(requester_email_input),''));
  if verified_email is null then raise exception 'A verified account email is required'; end if;
  select * into existing from public.matrimony_access_requests
    where requester_user_id=auth.uid() and site_id=site_id_input
      and status in ('pending','changes_requested','approved_pending_payment','active')
    order by created_at desc limit 1 for update;
  if found then
    if existing.status='changes_requested' or (existing.status='active' and existing.access_expires_at<=now()) then
      update public.matrimony_access_requests set requester_email=verified_email,reason=trim(reason_input),status='pending',quoted_price_cents=null,duration_days=null,payment_status='not_requested',payment_link=null,payment_reference=null,payment_requested_at=null,paid_at=null,access_starts_at=null,access_expires_at=null,admin_notes=null,reviewed_by=null,reviewed_at=null,updated_at=now() where id=existing.id and site_id=site_id_input;
    else raise exception 'An access request is already in progress'; end if;
  else
    insert into public.matrimony_access_requests(site_id,requester_user_id,requester_email,reason) values(site_id_input,auth.uid(),verified_email,trim(reason_input));
  end if;
end $$;
grant execute on function public.submit_matrimony_access_request(text,text,uuid) to authenticated;

drop function if exists public.review_matrimony_profile(uuid,text,text);
create function public.review_matrimony_profile(profile_id uuid, decision text, notes text, site_id_input uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_sdtv_admin() then raise exception 'Admin access required'; end if;
  if decision='approve' then update public.matrimony_profiles set status='approved',admin_notes=nullif(trim(notes),''),approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=profile_id and site_id=site_id_input;
  elsif decision='changes' then update public.matrimony_profiles set status='changes_requested',admin_notes=nullif(trim(notes),''),updated_at=now() where id=profile_id and site_id=site_id_input;
  elsif decision='hold' then update public.matrimony_profiles set status='on_hold',admin_notes=nullif(trim(notes),''),updated_at=now() where id=profile_id and site_id=site_id_input;
  elsif decision='reject' then update public.matrimony_profiles set status='rejected',admin_notes=nullif(trim(notes),''),updated_at=now() where id=profile_id and site_id=site_id_input;
  elsif decision='archive' then update public.matrimony_profiles set status='archived',admin_notes=nullif(trim(notes),''),updated_at=now() where id=profile_id and site_id=site_id_input;
  else raise exception 'Invalid profile decision'; end if;
  if not found then raise exception 'Profile not found for this site'; end if;
end $$;
grant execute on function public.review_matrimony_profile(uuid,text,text,uuid) to authenticated;

drop function if exists public.review_matrimony_access(uuid,text,integer,integer,text,text);
create function public.review_matrimony_access(request_id uuid, decision text, final_price_cents integer, final_duration_days integer, notes text, pay_url text, site_id_input uuid)
returns void language plpgsql security definer set search_path=public as $$
declare pricing public.matrimony_access_pricing%rowtype; amount integer; days integer;
begin
  if not public.is_sdtv_admin() then raise exception 'Admin access required'; end if;
  select * into pricing from public.matrimony_access_pricing where plan_key='standard_access';
  amount:=coalesce(final_price_cents,pricing.price_cents); days:=coalesce(final_duration_days,pricing.duration_days);
  if decision='approve' then
    update public.matrimony_access_requests set quoted_price_cents=amount,duration_days=days,payment_status=case when amount=0 then 'waived' else 'pending' end,status=case when amount=0 then 'active' else 'approved_pending_payment' end,payment_link=nullif(trim(pay_url),''),payment_requested_at=case when amount>0 then now() end,access_starts_at=case when amount=0 then now() end,access_expires_at=case when amount=0 then now()+(days||' days')::interval end,reviewed_by=auth.uid(),reviewed_at=now(),admin_notes=nullif(trim(notes),''),updated_at=now() where id=request_id and site_id=site_id_input;
  elsif decision='changes' then update public.matrimony_access_requests set status='changes_requested',admin_notes=nullif(trim(notes),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=request_id and site_id=site_id_input;
  elsif decision='reject' then update public.matrimony_access_requests set status='rejected',admin_notes=nullif(trim(notes),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=request_id and site_id=site_id_input;
  elsif decision='revoke' then update public.matrimony_access_requests set status='revoked',access_expires_at=now(),admin_notes=nullif(trim(notes),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=request_id and site_id=site_id_input;
  else raise exception 'Invalid access decision'; end if;
  if not found then raise exception 'Access request not found for this site'; end if;
end $$;
grant execute on function public.review_matrimony_access(uuid,text,integer,integer,text,text,uuid) to authenticated;

drop function if exists public.complete_matrimony_access_payment(uuid,text);
create function public.complete_matrimony_access_payment(request_id uuid, reference text, site_id_input uuid)
returns void language plpgsql security definer set search_path=public as $$
declare req public.matrimony_access_requests%rowtype;
begin
  if not public.is_sdtv_admin() then raise exception 'Admin access required'; end if;
  select * into req from public.matrimony_access_requests where id=request_id and site_id=site_id_input for update;
  if not found then raise exception 'Access request not found for this site'; end if;
  if req.status<>'approved_pending_payment' or req.payment_status<>'pending' then raise exception 'Request is not awaiting payment'; end if;
  update public.matrimony_access_requests set status='active',payment_status='paid',payment_reference=nullif(trim(reference),''),paid_at=now(),access_starts_at=now(),access_expires_at=now()+(req.duration_days||' days')::interval,updated_at=now() where id=request_id and site_id=site_id_input;
end $$;
grant execute on function public.complete_matrimony_access_payment(uuid,text,uuid) to authenticated;

drop policy if exists "Owners and entitled members read matrimony profile images" on storage.objects;
create policy "Owners and entitled members read matrimony profile images" on storage.objects for select to authenticated using (
  bucket_id='matrimony-profile-images' and (
    (storage.foldername(name))[1]=auth.uid()::text or public.is_sdtv_admin() or exists(
      select 1 from public.matrimony_profiles p
      where name=any(p.photo_paths) and p.status='approved' and exists(
        select 1 from public.matrimony_access_requests r
        where r.requester_user_id=auth.uid() and r.site_id=p.site_id
          and r.status='active' and r.access_expires_at>now()
      )
    )
  )
);

comment on column public.matrimony_profiles.site_id is 'Market that owns and moderates this private profile.';
comment on column public.matrimony_access_requests.site_id is 'Market whose approved profiles this access request may unlock.';
