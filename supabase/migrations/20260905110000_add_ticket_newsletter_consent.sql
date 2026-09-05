alter table public.ticket_orders
  add column if not exists newsletter_opt_in boolean not null default false,
  add column if not exists newsletter_opt_in_at timestamptz;

comment on column public.ticket_orders.newsletter_opt_in is
  'Whether the purchaser selected the SDTV newsletter option during ticket checkout.';
comment on column public.ticket_orders.newsletter_opt_in_at is
  'Timestamp when newsletter consent was submitted with the ticket order.';
