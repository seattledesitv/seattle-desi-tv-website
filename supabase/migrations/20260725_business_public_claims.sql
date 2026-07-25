create table if not exists public.business_claim_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.local_businesses(id) on delete cascade,
  requester_user_id uuid references auth.users(id) on delete set null,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  relationship text,
  verification_details text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','needs_information')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists business_claim_requests_one_open_per_user on public.business_claim_requests(business_id, requester_user_id) where status in ('pending','needs_information');

create table if not exists public.business_managers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.local_businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager')),
  is_primary boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id,user_id)
);

create table if not exists public.business_edit_suggestions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.local_businesses(id) on delete cascade,
  submitter_user_id uuid references auth.users(id) on delete set null,
  submitter_name text,
  submitter_email text,
  suggestion text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.local_businesses add column if not exists owner_verified_at timestamptz;
alter table public.local_businesses add column if not exists owner_verified_by uuid references auth.users(id) on delete set null;

alter table public.business_claim_requests enable row level security;
alter table public.business_managers enable row level security;
alter table public.business_edit_suggestions enable row level security;

drop policy if exists "authenticated users submit business claims" on public.business_claim_requests;
create policy "authenticated users submit business claims" on public.business_claim_requests for insert to authenticated with check (requester_user_id = auth.uid());

drop policy if exists "users read own business claims" on public.business_claim_requests;
create policy "users read own business claims" on public.business_claim_requests for select to authenticated using (requester_user_id = auth.uid());

drop policy if exists "users update own open business claims" on public.business_claim_requests;
create policy "users update own open business claims" on public.business_claim_requests
for update to authenticated
using (requester_user_id = auth.uid() and status in ('pending','needs_information'))
with check (requester_user_id = auth.uid() and status = 'pending');

drop policy if exists "admins manage business claims" on public.business_claim_requests;
create policy "admins manage business claims" on public.business_claim_requests for all to authenticated using (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%')) with check (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%'));

drop policy if exists "users read own business manager rows" on public.business_managers;
create policy "users read own business manager rows" on public.business_managers for select to authenticated using (user_id=auth.uid() or exists(select 1 from public.admins a where a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')));

drop policy if exists "admins manage business managers" on public.business_managers;
create policy "admins manage business managers" on public.business_managers for all to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email'))) with check (exists(select 1 from public.admins a where a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')));

drop policy if exists "anyone submits edit suggestions" on public.business_edit_suggestions;
create policy "anyone submits edit suggestions" on public.business_edit_suggestions for insert to anon,authenticated with check (true);

drop policy if exists "admins manage edit suggestions" on public.business_edit_suggestions;
create policy "admins manage edit suggestions" on public.business_edit_suggestions for all to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email'))) with check (exists(select 1 from public.admins a where a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')));
