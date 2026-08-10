create table if not exists public.swirepay_payment_intents (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null unique default gen_random_uuid(),
  target_type text not null check (target_type in ('classified')),
  target_id uuid not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  description text not null,
  status text not null default 'pending' check (status in ('pending','succeeded','cancelled','expired')),
  payment_session_gid text unique,
  webhook_event_id uuid references public.swirepay_webhook_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  succeeded_at timestamptz
);

create unique index if not exists swirepay_pending_intent_target_unique
  on public.swirepay_payment_intents(target_type, target_id)
  where status = 'pending';
create index if not exists swirepay_payment_intent_owner_idx
  on public.swirepay_payment_intents(owner_user_id, created_at desc);

alter table public.swirepay_payment_intents enable row level security;

create policy "Owners read their Swirepay payment intents"
on public.swirepay_payment_intents for select to authenticated
using (owner_user_id = auth.uid());

create policy "Admins read Swirepay payment intents"
on public.swirepay_payment_intents for select to authenticated
using (exists(
  select 1 from public.admins a
  where a.user_id = auth.uid() and lower(a.role) like '%admin%'
));

alter table public.swirepay_payment_fulfillments
  alter column payment_link_gid drop not null;
alter table public.swirepay_payment_fulfillments
  add column if not exists payment_intent_id uuid unique
    references public.swirepay_payment_intents(id) on delete restrict;

create or replace function public.fulfill_swirepay_embedded_classified_payment(
  p_webhook_event_id uuid,
  p_payment_session_gid text,
  p_intent_token uuid,
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
  intent_row public.swirepay_payment_intents%rowtype;
  classified_row public.classified_ads%rowtype;
  existing_target public.swirepay_payment_fulfillments%rowtype;
  duration_days integer;
begin
  if upper(coalesce(p_provider_status, '')) <> 'SUCCEEDED'
    or p_amount_cents <= 0
    or p_paid_amount_cents <> p_amount_cents
    or p_amount_received_cents <> p_amount_cents
    or upper(coalesce(p_currency_code, '')) <> 'USD'
    or p_payment_session_gid is null
    or p_intent_token is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into existing_target
  from public.swirepay_payment_fulfillments f
  where f.payment_session_gid = p_payment_session_gid;
  if found then
    return jsonb_build_object(
      'status', 'duplicate',
      'target_type', existing_target.target_type,
      'target_id', existing_target.target_id
    );
  end if;

  select * into intent_row
  from public.swirepay_payment_intents i
  where i.public_token = p_intent_token
    and i.target_type = 'classified'
    and i.status = 'pending'
    and i.expires_at > now()
    and i.amount_cents = p_amount_cents
    and i.currency = upper(p_currency_code)
  for update;
  if not found then
    return jsonb_build_object('status', 'unmatched');
  end if;

  select * into classified_row
  from public.classified_ads c
  where c.id = intent_row.target_id
    and c.created_by = intent_row.owner_user_id
    and c.status = 'approved_pending_payment'
    and c.payment_status = 'pending'
    and c.quoted_price_cents = p_amount_cents
  for update;
  if not found then
    return jsonb_build_object('status', 'target_not_payable');
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

  update public.swirepay_payment_intents
  set status = 'succeeded',
      payment_session_gid = p_payment_session_gid,
      webhook_event_id = p_webhook_event_id,
      succeeded_at = now()
  where id = intent_row.id;

  insert into public.classified_activity_log(classified_id, action, details)
  values (
    classified_row.id,
    'embedded_payment_succeeded',
    jsonb_build_object(
      'provider', 'swirepay',
      'payment_session_gid', p_payment_session_gid,
      'amount_cents', p_amount_cents,
      'currency', upper(p_currency_code)
    )
  );

  insert into public.swirepay_payment_fulfillments(
    payment_session_gid, payment_link_gid, payment_intent_id,
    target_type, target_id, amount_cents, currency,
    provider_status, webhook_event_id
  ) values (
    p_payment_session_gid, null, intent_row.id,
    'classified', classified_row.id, p_amount_cents, upper(p_currency_code),
    upper(p_provider_status), p_webhook_event_id
  );

  return jsonb_build_object(
    'status', 'fulfilled',
    'target_type', 'classified',
    'target_id', classified_row.id
  );
end
$$;

revoke all on function public.fulfill_swirepay_embedded_classified_payment(uuid,text,uuid,text,integer,integer,integer,text) from public;
grant execute on function public.fulfill_swirepay_embedded_classified_payment(uuid,text,uuid,text,integer,integer,integer,text) to service_role;

comment on table public.swirepay_payment_intents is
  'Server-created, owner-bound checkout intents with frozen amounts for embedded Swirepay payments.';
