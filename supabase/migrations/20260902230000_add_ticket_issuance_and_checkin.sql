-- Provider-neutral fulfillment: a verified payment webhook may call this function.
create or replace function public.fulfill_paid_ticket_order(p_order_token uuid,p_payment_session_gid text,p_payment_gid text,p_paid_cents integer,p_currency text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.ticket_orders%rowtype; v_item public.ticket_order_items%rowtype; v_index integer; v_created integer:=0;
begin
  select * into v_order from public.ticket_orders where public_token=p_order_token for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if v_order.status='paid' then return jsonb_build_object('status','duplicate','orderId',v_order.id); end if;
  if v_order.status<>'pending_payment' then return jsonb_build_object('status','invalid_state'); end if;
  if v_order.payment_expires_at<=now() then return jsonb_build_object('status','expired'); end if;
  if p_paid_cents<>v_order.total_cents or upper(p_currency)<>upper(v_order.currency) then return jsonb_build_object('status','amount_mismatch'); end if;
  for v_item in select * from public.ticket_order_items where order_id=v_order.id
  loop
    update public.event_ticket_types set quantity_reserved=quantity_reserved-v_item.quantity,quantity_sold=quantity_sold+v_item.quantity,updated_at=now() where id=v_item.ticket_type_id and quantity_reserved>=v_item.quantity;
    if not found then raise exception 'Reserved ticket inventory is inconsistent.'; end if;
    for v_index in 1..v_item.quantity loop
      insert into public.event_tickets(site_id,order_id,order_item_id,event_id,ticket_type_id,attendee_name,attendee_email,ticket_code)
      values(v_order.site_id,v_order.id,v_item.id,v_order.event_id,v_item.ticket_type_id,v_order.buyer_name,v_order.buyer_email,'SDTV-TKT-'||upper(substr(md5(random()::text||clock_timestamp()::text||v_order.id::text),1,16)));
      v_created:=v_created+1;
    end loop;
  end loop;
  update public.ticket_orders set status='paid',provider_payment_session_gid=p_payment_session_gid,provider_payment_gid=p_payment_gid,paid_at=now(),updated_at=now() where id=v_order.id;
  return jsonb_build_object('status','fulfilled','orderId',v_order.id,'ticketsCreated',v_created);
end;$$;
revoke all on function public.fulfill_paid_ticket_order(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.fulfill_paid_ticket_order(uuid,text,text,integer,text) to service_role;

create or replace function public.check_in_event_ticket(p_ticket_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_ticket public.event_tickets%rowtype; v_order public.ticket_orders%rowtype;
begin
  select * into v_ticket from public.event_tickets where upper(ticket_code)=upper(trim(p_ticket_code)) for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  select * into v_order from public.ticket_orders where id=v_ticket.order_id;
  if not (public.sdtv_is_admin() or public.sdtv_manages_organization(v_order.organization_id,v_order.site_id)) then raise exception 'You are not authorized to check in tickets for this event.'; end if;
  if v_ticket.status='checked_in' then return jsonb_build_object('status','already_checked_in','checkedInAt',v_ticket.checked_in_at,'ticketCode',v_ticket.ticket_code); end if;
  if v_ticket.status<>'valid' then return jsonb_build_object('status','invalid','ticketStatus',v_ticket.status); end if;
  update public.event_tickets set status='checked_in',checked_in_at=now(),checked_in_by=auth.uid(),updated_at=now() where id=v_ticket.id;
  return jsonb_build_object('status','checked_in','ticketCode',v_ticket.ticket_code,'eventId',v_ticket.event_id,'attendeeName',v_ticket.attendee_name);
end;$$;
revoke all on function public.check_in_event_ticket(text) from public,anon;
grant execute on function public.check_in_event_ticket(text) to authenticated;
