create table if not exists public.organization_claim_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.community_organizations(id) on delete cascade,
  requester_user_id uuid references auth.users(id) on delete set null,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  relationship text,
  verification_details text,
  status text not null default 'pending',
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_managers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.community_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'authorized_representative',
  is_primary boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id,user_id)
);

alter table public.community_organizations add column if not exists manager_verified_at timestamptz;
alter table public.community_organizations add column if not exists manager_verified_by uuid references auth.users(id) on delete set null;