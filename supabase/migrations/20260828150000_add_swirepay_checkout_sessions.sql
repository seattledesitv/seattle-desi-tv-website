create table if not exists public.swirepay_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null
    references public.swirepay_payment_intents(id) on delete restrict,
  payment_session_gid text not null unique,
  accepted_origin text not null,
  status text not null default 'created'
    check (status in ('created', 'succeeded', 'expired', 'failed')),
  provider_expires_at timestamptz,
  created_at timestamptz not null default now(),
  succeeded_at timestamptz
);

create index if not exists swirepay_checkout_sessions_intent_idx
  on public.swirepay_checkout_sessions(payment_intent_id, created_at desc);

alter table public.swirepay_checkout_sessions enable row level security;

drop policy if exists "Owners read their Swirepay checkout sessions"
  on public.swirepay_checkout_sessions;
create policy "Owners read their Swirepay checkout sessions"
  on public.swirepay_checkout_sessions
  for select to authenticated
  using (exists(
    select 1
    from public.swirepay_payment_intents i
    where i.id = payment_intent_id
      and i.owner_user_id = auth.uid()
  ));

drop policy if exists "Admins read Swirepay checkout sessions"
  on public.swirepay_checkout_sessions;
create policy "Admins read Swirepay checkout sessions"
  on public.swirepay_checkout_sessions
  for select to authenticated
  using (exists(
    select 1 from public.admins a
    where a.user_id = auth.uid() and lower(a.role) like '%admin%'
  ));

comment on table public.swirepay_checkout_sessions is
  'Server-minted Swirepay checkout sessions linked to frozen internal payment intents. Secure tokens and API keys are never stored.';

comment on column public.swirepay_checkout_sessions.accepted_origin is
  'Exact HTTPS origin authorized when the Swirepay checkout session was minted.';
