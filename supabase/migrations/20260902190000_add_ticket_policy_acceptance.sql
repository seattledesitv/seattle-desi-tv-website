-- Immutable policy snapshots protect buyers and organizers from later edits.
alter table public.ticket_orders
  add column if not exists refund_policy_snapshot text,
  add column if not exists terms_snapshot text,
  add column if not exists policy_accepted_at timestamptz,
  add column if not exists policy_version text,
  add column if not exists buyer_ip_hash text,
  add column if not exists buyer_user_agent text;
comment on column public.ticket_orders.refund_policy_snapshot is 'Refund policy shown when the order was created.';
comment on column public.ticket_orders.terms_snapshot is 'Ticket terms shown when the order was created.';
comment on column public.ticket_orders.buyer_ip_hash is 'Optional one-way audit hash; never store a raw purchaser IP address.';
