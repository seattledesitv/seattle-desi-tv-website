create table if not exists public.sponsorship_package_templates (
  id uuid primary key default gen_random_uuid(),
  tier text not null unique check (tier in ('platinum','gold','silver','bronze')),
  name text not null,
  price_cents integer check (price_cents is null or price_cents >= 0),
  benefits jsonb not null default '[]'::jsonb,
  agreement_template text not null default '',
  active boolean not null default true,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.sponsorship_agreements (
  id uuid primary key default gen_random_uuid(),
  agreement_number text not null unique,
  business_id uuid references public.local_businesses(id) on delete set null,
  homepage_sponsor_id uuid references public.homepage_sponsors(id) on delete set null,
  package_template_id uuid references public.sponsorship_package_templates(id) on delete set null,
  tier text not null check (tier in ('platinum','gold','silver','bronze')),
  sponsor_name text not null,
  sponsor_email text not null,
  sponsor_contact_name text,
  sponsor_contact_title text,
  start_date date not null,
  end_date date not null,
  base_amount_cents integer not null check (base_amount_cents >= 0),
  discount_type text not null default 'none' check (discount_type in ('none','fixed','percent')),
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  final_amount_cents integer not null check (final_amount_cents >= 0),
  currency text not null default 'USD',
  agreement_content text not null,
  agreement_content_hash text,
  status text not null default 'draft' check (status in ('draft','sent','viewed','accepted','declined','active','completed','cancelled')),
  access_token_hash text,
  access_token_expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  signer_name text,
  signer_title text,
  signer_ip text,
  signer_user_agent text,
  activation_condition text not null default 'first_payment' check (activation_condition in ('acceptance','first_payment','full_payment','manual')),
  internal_notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsorship_agreement_dates_check check (end_date >= start_date)
);

create table if not exists public.sponsorship_payment_installments (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.sponsorship_agreements(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  amount_cents integer not null check (amount_cents >= 0),
  due_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled','due','overdue','proof_submitted','verified','rejected','waived')),
  zelle_recipient text not null default 'info@seattledesitv.com',
  confirmation_url text,
  confirmation_submitted_at timestamptz,
  submitted_note text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  reminder_last_sent_at timestamptz,
  reminder_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agreement_id, installment_number)
);

create table if not exists public.sponsorship_agreement_events (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.sponsorship_agreements(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sponsorship_agreements_business_idx on public.sponsorship_agreements(business_id, created_at desc);
create index if not exists sponsorship_agreements_status_idx on public.sponsorship_agreements(status, end_date);
create index if not exists sponsorship_installments_due_idx on public.sponsorship_payment_installments(status, due_date);
create index if not exists sponsorship_events_agreement_idx on public.sponsorship_agreement_events(agreement_id, created_at desc);

alter table public.sponsorship_package_templates enable row level security;
alter table public.sponsorship_agreements enable row level security;
alter table public.sponsorship_payment_installments enable row level security;
alter table public.sponsorship_agreement_events enable row level security;

create policy "authenticated read active sponsorship packages" on public.sponsorship_package_templates for select to authenticated using (active or exists(select 1 from public.admins a where a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')));
create policy "admins manage sponsorship packages" on public.sponsorship_package_templates for all to authenticated using (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%')) with check (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%'));
create policy "admins manage sponsorship agreements" on public.sponsorship_agreements for all to authenticated using (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%')) with check (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%'));
create policy "business managers read sponsorship agreements" on public.sponsorship_agreements for select to authenticated using (exists(select 1 from public.business_managers m where m.business_id=sponsorship_agreements.business_id and m.user_id=auth.uid() and m.active));
create policy "admins manage sponsorship installments" on public.sponsorship_payment_installments for all to authenticated using (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%')) with check (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%'));
create policy "business managers read sponsorship installments" on public.sponsorship_payment_installments for select to authenticated using (exists(select 1 from public.sponsorship_agreements sa join public.business_managers m on m.business_id=sa.business_id where sa.id=sponsorship_payment_installments.agreement_id and m.user_id=auth.uid() and m.active));
create policy "admins read sponsorship events" on public.sponsorship_agreement_events for select to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')));

insert into public.sponsorship_package_templates (tier,name,price_cents,benefits,display_order)
values
('platinum','Platinum Sponsor',500000,'["Website partner logo","Social media recognition","12 Desi Weekend Vibes cover placements","Weekly business or offer promotion","Professional studio spotlight interview","Daily radio promotion"]'::jsonb,10),
('gold','Gold Sponsor',250000,'["Website partner logo","Social media recognition","6 Desi Weekend Vibes cover placements","Biweekly business or offer promotion","On-location spotlight interview","Weekly radio promotion"]'::jsonb,20),
('silver','Silver Sponsor',60000,'["Website partner logo","Social media recognition","12 business or offer promotions"]'::jsonb,30),
('bronze','Bronze Sponsor',null,'[]'::jsonb,40)
on conflict (tier) do nothing;

update public.sponsorship_package_templates
set agreement_template = $agreement$SEATTLE DESI TV SPONSORSHIP AGREEMENT

This agreement is between Seattle Desi TV (SDTV), a nonprofit 501(c)(3) community organization, and {{SPONSOR_NAME}}.

TERM
The sponsorship begins {{START_DATE}} and ends {{END_DATE}}.

PACKAGE
The Sponsor selects {{PACKAGE_NAME}} with these benefits:
{{BENEFITS}}

PAYMENT
The standard amount is {{BASE_AMOUNT}}. The approved discount is {{DISCOUNT}} and the final amount is {{FINAL_AMOUNT}}. Payments follow the attached installment schedule and must be sent by Zelle to info@seattledesitv.com with confirmation uploaded for verification.

APPROVAL
Electronic acceptance confirms the signer is authorized to accept these terms for the Sponsor. SDTV will use commercially reasonable efforts to deliver the package benefits; specific audience reach or business results are not guaranteed.$agreement$
where agreement_template = '';

comment on table public.sponsorship_agreements is 'Immutable-on-send sponsorship agreement snapshots with acceptance audit fields.';
comment on table public.sponsorship_payment_installments is 'Flexible Zelle payment schedule; uploaded proof requires admin verification.';
