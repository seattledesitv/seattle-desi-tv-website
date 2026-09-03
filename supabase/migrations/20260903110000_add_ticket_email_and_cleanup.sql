create table if not exists public.ticket_email_deliveries(id uuid primary key default gen_random_uuid(),site_id uuid not null references public.sites(id),order_id uuid not null references public.ticket_orders(id) on delete cascade,recipient text not null,subject text not null,status text not null default 'pending',provider_email_id text,error_message text,sent_at timestamptz,created_at timestamptz not null default now(),constraint ticket_email_status_check check(status in('pending','sent','failed')));
alter table public.ticket_email_deliveries enable row level security;
drop policy if exists "ticket email admins read" on public.ticket_email_deliveries;
create policy "ticket email admins read" on public.ticket_email_deliveries for select to authenticated using(public.sdtv_is_admin());

create or replace function public.expire_ticket_reservations() returns integer language plpgsql security definer set search_path=public as $$
declare v_order uuid; v_count integer:=0;
begin
for v_order in select id from public.ticket_orders where status='pending_payment' and payment_expires_at<=now() for update skip locked loop
 update public.event_ticket_types t set quantity_reserved=greatest(0,t.quantity_reserved-i.quantity),updated_at=now() from public.ticket_order_items i where i.order_id=v_order and t.id=i.ticket_type_id;
 update public.ticket_orders set status='expired',updated_at=now() where id=v_order; v_count:=v_count+1;
end loop; return v_count; end;$$;
revoke all on function public.expire_ticket_reservations() from public,anon,authenticated;
grant execute on function public.expire_ticket_reservations() to service_role;
