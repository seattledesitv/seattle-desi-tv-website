-- First-class, multi-city event ticketing foundation.
-- Bank and identity details are collected by Swirepay and must never be stored here.

create table if not exists public.organization_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  organization_id uuid not null references public.community_organizations(id) on delete cascade,
  provider text not null default 'swirepay',
  provider_account_gid text,
  onboarding_reference text,
  onboarding_status text not null default 'not_started',
  payouts_enabled boolean not null default false,
  requirements_due text[] not null default '{}',
  last_error text,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, organization_id, provider),
  constraint organization_payment_accounts_status_check check (onboarding_status in ('not_started','in_progress','submitted','verified','restricted','rejected')),
  constraint organization_payment_accounts_metadata_check check (jsonb_typeof(provider_metadata) = 'object')
);

create table if not exists public.event_ticket_settings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete cascade,
  organization_id uuid not null references public.community_organizations(id) on delete restrict,
  status text not null default 'draft',
  currency text not null default 'USD',
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  venue_capacity integer,
  max_tickets_per_order integer not null default 10,
  fee_mode text not null default 'buyer_pays',
  platform_fee_flat_cents integer not null default 0,
  platform_fee_percent numeric(6,3) not null default 0,
  refund_policy text,
  terms text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, event_id),
  constraint event_ticket_settings_status_check check (status in ('draft','pending_review','active','paused','closed','rejected')),
  constraint event_ticket_settings_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint event_ticket_settings_capacity_check check (venue_capacity is null or venue_capacity > 0),
  constraint event_ticket_settings_order_limit_check check (max_tickets_per_order between 1 and 50),
  constraint event_ticket_settings_fee_mode_check check (fee_mode in ('buyer_pays','organizer_absorbs')),
  constraint event_ticket_settings_fee_check check (platform_fee_flat_cents >= 0 and platform_fee_percent between 0 and 100)
);

create table if not exists public.event_ticket_types (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  ticket_setting_id uuid not null references public.event_ticket_settings(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null default 0,
  quantity_total integer not null,
  quantity_reserved integer not null default 0,
  quantity_sold integer not null default 0,
  min_per_order integer not null default 1,
  max_per_order integer not null default 10,
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  status text not null default 'active',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_types_name_check check (length(trim(name)) > 0),
  constraint event_ticket_types_price_check check (price_cents >= 0),
  constraint event_ticket_types_quantity_check check (quantity_total > 0 and quantity_reserved >= 0 and quantity_sold >= 0 and quantity_reserved + quantity_sold <= quantity_total),
  constraint event_ticket_types_order_limit_check check (min_per_order between 1 and 50 and max_per_order between min_per_order and 50),
  constraint event_ticket_types_status_check check (status in ('active','hidden','sold_out','closed'))
);

create table if not exists public.ticket_orders (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  organization_id uuid not null references public.community_organizations(id) on delete restrict,
  buyer_user_id uuid references auth.users(id) on delete set null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  status text not null default 'pending_payment',
  currency text not null default 'USD',
  subtotal_cents integer not null,
  fee_cents integer not null default 0,
  total_cents integer not null,
  public_token uuid not null default gen_random_uuid() unique,
  provider text not null default 'swirepay',
  provider_payment_session_gid text unique,
  provider_payment_gid text,
  provider_account_gid text,
  payment_expires_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_orders_status_check check (status in ('pending_payment','paid','payment_failed','cancelled','expired','partially_refunded','refunded')),
  constraint ticket_orders_amount_check check (subtotal_cents >= 0 and fee_cents >= 0 and total_cents = subtotal_cents + fee_cents)
);

create table if not exists public.ticket_order_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  order_id uuid not null references public.ticket_orders(id) on delete cascade,
  ticket_type_id uuid not null references public.event_ticket_types(id) on delete restrict,
  ticket_name text not null,
  unit_price_cents integer not null,
  quantity integer not null,
  line_total_cents integer not null,
  created_at timestamptz not null default now(),
  constraint ticket_order_items_amount_check check (unit_price_cents >= 0 and quantity > 0 and line_total_cents = unit_price_cents * quantity)
);

create table if not exists public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  order_id uuid not null references public.ticket_orders(id) on delete cascade,
  order_item_id uuid not null references public.ticket_order_items(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_type_id uuid not null references public.event_ticket_types(id) on delete restrict,
  attendee_name text,
  attendee_email text,
  ticket_code text not null unique,
  qr_token uuid not null default gen_random_uuid() unique,
  status text not null default 'valid',
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_tickets_status_check check (status in ('valid','checked_in','cancelled','refunded','void'))
);

create table if not exists public.ticket_settlements (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  organization_id uuid not null references public.community_organizations(id) on delete restrict,
  period_start_at timestamptz,
  period_end_at timestamptz,
  currency text not null default 'USD',
  gross_sales_cents integer not null default 0,
  refunds_cents integer not null default 0,
  processing_fees_cents integer not null default 0,
  platform_fees_cents integer not null default 0,
  adjustments_cents integer not null default 0,
  net_payout_cents integer not null default 0,
  status text not null default 'draft',
  provider_transfer_gid text unique,
  payout_reference text,
  failure_reason text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  transferred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_settlements_status_check check (status in ('draft','pending_approval','approved','processing','paid','failed','cancelled')),
  constraint ticket_settlements_amount_check check (
    gross_sales_cents >= 0 and refunds_cents >= 0 and processing_fees_cents >= 0 and platform_fees_cents >= 0
    and net_payout_cents = gross_sales_cents - refunds_cents - processing_fees_cents - platform_fees_cents + adjustments_cents
  )
);

create index if not exists organization_payment_accounts_org_idx on public.organization_payment_accounts(site_id, organization_id);
create index if not exists event_ticket_settings_public_idx on public.event_ticket_settings(site_id, event_id, status);
create index if not exists event_ticket_types_sale_idx on public.event_ticket_types(site_id, event_id, status, display_order);
create index if not exists ticket_orders_org_idx on public.ticket_orders(site_id, organization_id, created_at desc);
create index if not exists ticket_orders_buyer_idx on public.ticket_orders(buyer_user_id, created_at desc);
create index if not exists event_tickets_event_idx on public.event_tickets(site_id, event_id, status);
create index if not exists ticket_settlements_org_idx on public.ticket_settlements(site_id, organization_id, created_at desc);
create index if not exists ticket_settlements_status_idx on public.ticket_settlements(site_id, status, created_at desc);

create or replace function public.validate_event_ticket_setting_scope()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists(select 1 from public.events e where e.id = new.event_id and e.site_id = new.site_id) then
    raise exception 'Ticket event does not belong to this site.';
  end if;
  if not exists(select 1 from public.community_organizations o where o.id = new.organization_id and o.site_id = new.site_id and o.status = 'approved') then
    raise exception 'Ticket organization is not an approved organization for this site.';
  end if;
  if not exists(select 1 from public.event_organizations eo where eo.event_id = new.event_id and eo.organization_id = new.organization_id and eo.site_id = new.site_id) then
    raise exception 'Organization must be linked to the event before configuring ticket sales.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_event_ticket_setting_scope_trigger on public.event_ticket_settings;
create trigger validate_event_ticket_setting_scope_trigger before insert or update of site_id,event_id,organization_id on public.event_ticket_settings for each row execute function public.validate_event_ticket_setting_scope();

create or replace function public.validate_event_ticket_type_scope()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists(select 1 from public.event_ticket_settings s where s.id = new.ticket_setting_id and s.site_id = new.site_id and s.event_id = new.event_id) then
    raise exception 'Ticket type does not match its event ticket configuration.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_event_ticket_type_scope_trigger on public.event_ticket_types;
create trigger validate_event_ticket_type_scope_trigger before insert or update of site_id,ticket_setting_id,event_id on public.event_ticket_types for each row execute function public.validate_event_ticket_type_scope();

create or replace function public.sdtv_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admins a where a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt()->>'email')) $$;

create or replace function public.sdtv_manages_organization(target_organization_id uuid, target_site_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_managers m where m.organization_id = target_organization_id and m.site_id = target_site_id and m.user_id = auth.uid() and m.active) $$;

alter table public.organization_payment_accounts enable row level security;
alter table public.event_ticket_settings enable row level security;
alter table public.event_ticket_types enable row level security;
alter table public.ticket_orders enable row level security;
alter table public.ticket_order_items enable row level security;
alter table public.event_tickets enable row level security;
alter table public.ticket_settlements enable row level security;

drop policy if exists "payment accounts managers read" on public.organization_payment_accounts;
create policy "payment accounts managers read" on public.organization_payment_accounts for select to authenticated using (public.sdtv_is_admin() or public.sdtv_manages_organization(organization_id, site_id));
drop policy if exists "payment accounts admins manage" on public.organization_payment_accounts;
create policy "payment accounts admins manage" on public.organization_payment_accounts for all to authenticated using (public.sdtv_is_admin()) with check (public.sdtv_is_admin());

drop policy if exists "ticket settings public read active" on public.event_ticket_settings;
create policy "ticket settings public read active" on public.event_ticket_settings for select using (status = 'active');
drop policy if exists "ticket settings managers read" on public.event_ticket_settings;
create policy "ticket settings managers read" on public.event_ticket_settings for select to authenticated using (public.sdtv_is_admin() or public.sdtv_manages_organization(organization_id, site_id));
drop policy if exists "ticket settings managers insert" on public.event_ticket_settings;
create policy "ticket settings managers insert" on public.event_ticket_settings for insert to authenticated with check (public.sdtv_is_admin() or public.sdtv_manages_organization(organization_id, site_id));
drop policy if exists "ticket settings managers update" on public.event_ticket_settings;
create policy "ticket settings managers update" on public.event_ticket_settings for update to authenticated using (public.sdtv_is_admin() or public.sdtv_manages_organization(organization_id, site_id)) with check (public.sdtv_is_admin() or (public.sdtv_manages_organization(organization_id, site_id) and status in ('draft','pending_review','paused','closed')));
drop policy if exists "ticket settings admins delete" on public.event_ticket_settings;
create policy "ticket settings admins delete" on public.event_ticket_settings for delete to authenticated using (public.sdtv_is_admin());

drop policy if exists "ticket types public read active" on public.event_ticket_types;
create policy "ticket types public read active" on public.event_ticket_types for select using (status = 'active' and exists(select 1 from public.event_ticket_settings s where s.id = ticket_setting_id and s.status = 'active'));
drop policy if exists "ticket types managers read" on public.event_ticket_types;
create policy "ticket types managers read" on public.event_ticket_types for select to authenticated using (public.sdtv_is_admin() or exists(select 1 from public.event_ticket_settings s where s.id = ticket_setting_id and public.sdtv_manages_organization(s.organization_id, s.site_id)));
drop policy if exists "ticket types managers insert" on public.event_ticket_types;
create policy "ticket types managers insert" on public.event_ticket_types for insert to authenticated with check (public.sdtv_is_admin() or exists(select 1 from public.event_ticket_settings s where s.id = ticket_setting_id and public.sdtv_manages_organization(s.organization_id, s.site_id)));
drop policy if exists "ticket types managers update" on public.event_ticket_types;
create policy "ticket types managers update" on public.event_ticket_types for update to authenticated using (public.sdtv_is_admin() or exists(select 1 from public.event_ticket_settings s where s.id = ticket_setting_id and public.sdtv_manages_organization(s.organization_id, s.site_id))) with check (public.sdtv_is_admin() or exists(select 1 from public.event_ticket_settings s where s.id = ticket_setting_id and public.sdtv_manages_organization(s.organization_id, s.site_id)));
drop policy if exists "ticket types managers delete" on public.event_ticket_types;
create policy "ticket types managers delete" on public.event_ticket_types for delete to authenticated using (public.sdtv_is_admin() or exists(select 1 from public.event_ticket_settings s where s.id = ticket_setting_id and public.sdtv_manages_organization(s.organization_id, s.site_id)));

drop policy if exists "ticket orders buyer read" on public.ticket_orders;
create policy "ticket orders buyer read" on public.ticket_orders for select to authenticated using (buyer_user_id = auth.uid() or public.sdtv_is_admin() or public.sdtv_manages_organization(organization_id, site_id));
drop policy if exists "ticket order items authorized read" on public.ticket_order_items;
create policy "ticket order items authorized read" on public.ticket_order_items for select to authenticated using (exists(select 1 from public.ticket_orders o where o.id = order_id and (o.buyer_user_id = auth.uid() or public.sdtv_is_admin() or public.sdtv_manages_organization(o.organization_id, o.site_id))));
drop policy if exists "event tickets authorized read" on public.event_tickets;
create policy "event tickets authorized read" on public.event_tickets for select to authenticated using (exists(select 1 from public.ticket_orders o where o.id = order_id and (o.buyer_user_id = auth.uid() or public.sdtv_is_admin() or public.sdtv_manages_organization(o.organization_id, o.site_id))));
drop policy if exists "ticket settlements authorized read" on public.ticket_settlements;
create policy "ticket settlements authorized read" on public.ticket_settlements for select to authenticated using (public.sdtv_is_admin() or public.sdtv_manages_organization(organization_id, site_id));
drop policy if exists "ticket settlements admins manage" on public.ticket_settlements;
create policy "ticket settlements admins manage" on public.ticket_settlements for all to authenticated using (public.sdtv_is_admin()) with check (public.sdtv_is_admin());

revoke all on function public.sdtv_is_admin() from public;
revoke all on function public.sdtv_manages_organization(uuid,uuid) from public;
grant execute on function public.sdtv_is_admin() to authenticated;
grant execute on function public.sdtv_manages_organization(uuid,uuid) to authenticated;

revoke all on function public.validate_event_ticket_setting_scope() from public;
revoke all on function public.validate_event_ticket_type_scope() from public;

comment on table public.organization_payment_accounts is 'Safe Swirepay organizer payout references and verification status only. Ticket charges settle first to SDTV; never store raw bank or identity data.';
comment on table public.event_ticket_settings is 'Per-event ticket-sales configuration owned by a verified organization and scoped to one site.';
comment on table public.ticket_orders is 'Server-created ticket orders. Payment confirmation must come from a verified Swirepay webhook.';
comment on table public.ticket_settlements is 'Auditable organizer settlement ledger for funds transferred by SDTV through Swirepay after ticket collection.';
