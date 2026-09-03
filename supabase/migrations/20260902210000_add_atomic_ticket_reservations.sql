-- Atomically reserve inventory and freeze the purchaser's accepted policies.
alter table public.ticket_orders add column if not exists order_number text;
create unique index if not exists ticket_orders_order_number_uidx on public.ticket_orders(order_number) where order_number is not null;

create or replace function public.create_ticket_order_reservation(
  p_site_id uuid,
  p_event_id uuid,
  p_buyer_user_id uuid,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text,
  p_items jsonb,
  p_policy_accepted boolean,
  p_ip_hash text,
  p_user_agent text
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_setting public.event_ticket_settings%rowtype;
  v_type public.event_ticket_types%rowtype;
  v_item jsonb;
  v_order_id uuid;
  v_public_token uuid;
  v_order_number text;
  v_quantity integer;
  v_count integer := 0;
  v_subtotal integer := 0;
  v_fee integer := 0;
  v_expires timestamptz := now() + interval '15 minutes';
  v_policy_version text;
begin
  if not p_policy_accepted then raise exception 'Ticket terms and refund policy must be accepted.'; end if;
  if length(trim(coalesce(p_buyer_name,''))) < 2 then raise exception 'Buyer name is required.'; end if;
  if p_buyer_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'A valid buyer email is required.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'Select at least one ticket.'; end if;

  -- Release inventory from abandoned reservations before checking availability.
  for v_order_id in select id from public.ticket_orders where site_id=p_site_id and status='pending_payment' and payment_expires_at<=now() for update
  loop
    update public.event_ticket_types t set quantity_reserved=t.quantity_reserved-i.quantity, updated_at=now()
      from public.ticket_order_items i where i.order_id=v_order_id and t.id=i.ticket_type_id;
    update public.ticket_orders set status='expired', updated_at=now() where id=v_order_id;
  end loop;

  select * into v_setting from public.event_ticket_settings
    where site_id=p_site_id and event_id=p_event_id and status='active' for update;
  if not found then raise exception 'Ticket sales are not active for this event.'; end if;
  if v_setting.sales_start_at is not null and v_setting.sales_start_at>now() then raise exception 'Ticket sales have not started.'; end if;
  if v_setting.sales_end_at is not null and v_setting.sales_end_at<=now() then raise exception 'Ticket sales have ended.'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item->>'quantity')::integer,0);
    select * into v_type from public.event_ticket_types where id=(v_item->>'ticketTypeId')::uuid and ticket_setting_id=v_setting.id and site_id=p_site_id and status='active' for update;
    if not found then raise exception 'A selected ticket type is unavailable.'; end if;
    if v_quantity<1 or v_quantity>v_type.max_per_order then raise exception 'Invalid quantity for %.',v_type.name; end if;
    if v_type.sales_start_at is not null and v_type.sales_start_at>now() then raise exception '% is not on sale yet.',v_type.name; end if;
    if v_type.sales_end_at is not null and v_type.sales_end_at<=now() then raise exception '% sales have ended.',v_type.name; end if;
    if v_type.quantity_reserved+v_type.quantity_sold+v_quantity>v_type.quantity_total then raise exception 'Not enough % tickets remain.',v_type.name; end if;
    v_count:=v_count+v_quantity; v_subtotal:=v_subtotal+(v_type.price_cents*v_quantity);
  end loop;
  if v_count>v_setting.max_tickets_per_order then raise exception 'Order exceeds the ticket limit.'; end if;
  v_fee:=case when v_setting.fee_mode='buyer_pays' then v_setting.platform_fee_flat_cents+round(v_subtotal*v_setting.platform_fee_percent/100.0)::integer else 0 end;
  v_policy_version:=md5(coalesce(v_setting.refund_policy,'')||E'\n---\n'||coalesce(v_setting.terms,''));
  v_public_token:=gen_random_uuid(); v_order_number:='SDTV-'||upper(substr(replace(v_public_token::text,'-',''),1,10));
  insert into public.ticket_orders(id,site_id,event_id,organization_id,buyer_user_id,buyer_name,buyer_email,buyer_phone,status,currency,subtotal_cents,fee_cents,total_cents,public_token,payment_expires_at,refund_policy_snapshot,terms_snapshot,policy_accepted_at,policy_version,buyer_ip_hash,buyer_user_agent,order_number)
    values(gen_random_uuid(),p_site_id,p_event_id,v_setting.organization_id,p_buyer_user_id,trim(p_buyer_name),lower(trim(p_buyer_email)),nullif(trim(p_buyer_phone),''),'pending_payment',v_setting.currency,v_subtotal,v_fee,v_subtotal+v_fee,v_public_token,v_expires,v_setting.refund_policy,v_setting.terms,now(),v_policy_version,p_ip_hash,left(p_user_agent,300),v_order_number)
    returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity:=(v_item->>'quantity')::integer;
    select * into v_type from public.event_ticket_types where id=(v_item->>'ticketTypeId')::uuid for update;
    insert into public.ticket_order_items(site_id,order_id,ticket_type_id,ticket_name,unit_price_cents,quantity,line_total_cents) values(p_site_id,v_order_id,v_type.id,v_type.name,v_type.price_cents,v_quantity,v_type.price_cents*v_quantity);
    update public.event_ticket_types set quantity_reserved=quantity_reserved+v_quantity,updated_at=now() where id=v_type.id;
  end loop;
  return jsonb_build_object('token',v_public_token,'orderNumber',v_order_number,'subtotalCents',v_subtotal,'feeCents',v_fee,'totalCents',v_subtotal+v_fee,'currency',v_setting.currency,'expiresAt',v_expires);
end;
$$;
revoke all on function public.create_ticket_order_reservation(uuid,uuid,uuid,text,text,text,jsonb,boolean,text,text) from public,anon,authenticated;
grant execute on function public.create_ticket_order_reservation(uuid,uuid,uuid,text,text,text,jsonb,boolean,text,text) to service_role;

comment on function public.create_ticket_order_reservation(uuid,uuid,uuid,text,text,text,jsonb,boolean,text,text) is 'Service-only atomic ticket reservation with server-priced line items and immutable policy acceptance.';
