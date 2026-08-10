alter table public.business_offers
  add column if not exists swirepay_payment_link_gid text;

alter table public.classified_ads
  add column if not exists swirepay_payment_link_gid text;

create or replace function public.extract_swirepay_payment_link_gid(link text)
returns text
language sql
immutable
set search_path = public
as $$
  select (regexp_match(coalesce(link, ''), '(paymentlink-[A-Za-z0-9]+)'))[1]
$$;

create or replace function public.sync_swirepay_payment_link_gid()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.swirepay_payment_link_gid := public.extract_swirepay_payment_link_gid(new.payment_link);
  return new;
end
$$;

drop trigger if exists sync_business_offer_swirepay_link on public.business_offers;
create trigger sync_business_offer_swirepay_link
before insert or update of payment_link on public.business_offers
for each row execute function public.sync_swirepay_payment_link_gid();

drop trigger if exists sync_classified_swirepay_link on public.classified_ads;
create trigger sync_classified_swirepay_link
before insert or update of payment_link on public.classified_ads
for each row execute function public.sync_swirepay_payment_link_gid();

update public.business_offers
set swirepay_payment_link_gid = public.extract_swirepay_payment_link_gid(payment_link)
where payment_link is not null;

update public.classified_ads
set swirepay_payment_link_gid = public.extract_swirepay_payment_link_gid(payment_link)
where payment_link is not null;

create index if not exists business_offers_swirepay_link_idx
  on public.business_offers(swirepay_payment_link_gid)
  where swirepay_payment_link_gid is not null;

create index if not exists classified_ads_swirepay_link_idx
  on public.classified_ads(swirepay_payment_link_gid)
  where swirepay_payment_link_gid is not null;

create table if not exists public.swirepay_payment_fulfillments (
  id uuid primary key default gen_random_uuid(),
  payment_session_gid text not null unique,
  payment_link_gid text not null unique,
  target_type text not null check (target_type in ('business_offer', 'classified')),
  target_id uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null,
  provider_status text not null,
  webhook_event_id uuid not null references public.swirepay_webhook_events(id) on delete restrict,
  fulfilled_at timestamptz not null default now()
);

create index if not exists swirepay_fulfillment_target_idx
  on public.swirepay_payment_fulfillments(target_type, target_id);

alter table public.swirepay_payment_fulfillments enable row level security;

create policy "Admins read Swirepay payment fulfillments"
on public.swirepay_payment_fulfillments for select to authenticated
using (exists(
  select 1 from public.admins a
  where a.user_id = auth.uid() and lower(a.role) like '%admin%'
));

create or replace function public.fulfill_swirepay_payment(
  p_webhook_event_id uuid,
  p_payment_session_gid text,
  p_payment_link_gid text,
  p_provider_status text,
  p_amount_cents integer,
  p_paid_amount_cents integer,
  p_amount_received_cents integer,
  p_currency_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_row public.business_offers%rowtype;
  classified_row public.classified_ads%rowtype;
  duration_days integer;
  offer_match_count integer := 0;
  classified_match_count integer := 0;
  match_count integer := 0;
  existing_target public.swirepay_payment_fulfillments%rowtype;
begin
  if upper(coalesce(p_provider_status, '')) <> 'SUCCEEDED'
    or p_amount_cents <= 0
    or p_paid_amount_cents <> p_amount_cents
    or p_amount_received_cents <> p_amount_cents
    or upper(coalesce(p_currency_code, '')) <> 'USD'
    or p_payment_session_gid is null
    or p_payment_link_gid is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into existing_target
  from public.swirepay_payment_fulfillments f
  where f.payment_session_gid = p_payment_session_gid
     or f.payment_link_gid = p_payment_link_gid;
  if found then
    return jsonb_build_object(
      'status', 'duplicate',
      'target_type', existing_target.target_type,
      'target_id', existing_target.target_id
    );
  end if;

  select count(*) into offer_match_count
  from public.business_offers o
  where o.swirepay_payment_link_gid = p_payment_link_gid
    and o.status = 'approved_pending_payment'
    and o.payment_status = 'pending'
    and o.quoted_price_cents = p_amount_cents;

  select count(*) into classified_match_count
  from public.classified_ads c
  where c.swirepay_payment_link_gid = p_payment_link_gid
    and c.status = 'approved_pending_payment'
    and c.payment_status = 'pending'
    and c.quoted_price_cents = p_amount_cents;

  match_count := offer_match_count + classified_match_count;

  if match_count = 0 then
    return jsonb_build_object('status', 'unmatched');
  elsif match_count > 1 then
    return jsonb_build_object('status', 'ambiguous');
  end if;

  if offer_match_count = 1 then
    select * into offer_row
    from public.business_offers o
    where o.swirepay_payment_link_gid = p_payment_link_gid
      and o.status = 'approved_pending_payment'
      and o.payment_status = 'pending'
      and o.quoted_price_cents = p_amount_cents
    for update;
  else
    select * into classified_row
    from public.classified_ads c
    where c.swirepay_payment_link_gid = p_payment_link_gid
      and c.status = 'approved_pending_payment'
      and c.payment_status = 'pending'
      and c.quoted_price_cents = p_amount_cents
    for update;
  end if;

  if offer_row.id is not null then
    update public.business_offers
    set status = 'approved',
        payment_status = 'paid',
        payment_reference = p_payment_session_gid,
        paid_at = now(),
        updated_at = now()
    where id = offer_row.id;

    insert into public.swirepay_payment_fulfillments(
      payment_session_gid, payment_link_gid, target_type, target_id,
      amount_cents, currency, provider_status, webhook_event_id
    ) values (
      p_payment_session_gid, p_payment_link_gid, 'business_offer', offer_row.id,
      p_amount_cents, upper(p_currency_code), upper(p_provider_status), p_webhook_event_id
    );
    return jsonb_build_object(
      'status', 'fulfilled', 'target_type', 'business_offer', 'target_id', offer_row.id
    );
  end if;

  select p.duration_days into duration_days
  from public.classified_pricing p
  where p.placement = classified_row.requested_placement;
  if duration_days is null then
    return jsonb_build_object('status', 'invalid_pricing');
  end if;

  update public.classified_ads
  set status = 'active',
      payment_status = 'paid',
      payment_reference = p_payment_session_gid,
      paid_at = now(),
      starts_at = now(),
      expires_at = now() + make_interval(days => duration_days),
      updated_at = now()
  where id = classified_row.id;

  insert into public.classified_activity_log(classified_id, action, details)
  values (
    classified_row.id,
    'payment_succeeded',
    jsonb_build_object(
      'provider', 'swirepay',
      'payment_session_gid', p_payment_session_gid,
      'amount_cents', p_amount_cents,
      'currency', upper(p_currency_code)
    )
  );

  insert into public.swirepay_payment_fulfillments(
    payment_session_gid, payment_link_gid, target_type, target_id,
    amount_cents, currency, provider_status, webhook_event_id
  ) values (
    p_payment_session_gid, p_payment_link_gid, 'classified', classified_row.id,
    p_amount_cents, upper(p_currency_code), upper(p_provider_status), p_webhook_event_id
  );
  return jsonb_build_object(
    'status', 'fulfilled', 'target_type', 'classified', 'target_id', classified_row.id
  );
end
$$;

revoke all on function public.fulfill_swirepay_payment(uuid,text,text,text,integer,integer,integer,text) from public;
grant execute on function public.fulfill_swirepay_payment(uuid,text,text,text,integer,integer,integer,text) to service_role;

comment on table public.swirepay_payment_fulfillments is
  'Idempotent ledger of signature-verified Swirepay SUCCEEDED payments applied to uniquely matched approved targets.';
comment on column public.business_offers.swirepay_payment_link_gid is
  'Normalized Swirepay payment-link identifier extracted from the admin-approved checkout URL.';
comment on column public.classified_ads.swirepay_payment_link_gid is
  'Normalized Swirepay payment-link identifier extracted from the admin-approved checkout URL.';
