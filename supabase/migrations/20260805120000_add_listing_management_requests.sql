create table if not exists public.listing_management_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('event', 'influencer', 'community_group')),
  entity_id uuid not null,
  entity_name text not null,
  request_type text not null check (request_type in ('claim', 'correction', 'removal')),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  relationship text,
  details text not null,
  status text not null default 'pending' check (status in ('pending', 'needs_information', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_managers (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('event', 'influencer', 'community_group')),
  entity_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'manager' check (role in ('owner', 'manager')),
  verified_at timestamptz not null default now(),
  verified_by uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, user_id)
);

create index if not exists listing_management_requests_requester_idx
  on public.listing_management_requests(requester_user_id, created_at desc);
create index if not exists listing_management_requests_review_idx
  on public.listing_management_requests(status, entity_type, created_at desc);
create unique index if not exists listing_management_requests_open_unique_idx
  on public.listing_management_requests(entity_type, entity_id, request_type, requester_user_id)
  where status in ('pending', 'needs_information');
create index if not exists listing_managers_entity_idx
  on public.listing_managers(entity_type, entity_id) where active = true;

alter table public.listing_management_requests enable row level security;
alter table public.listing_managers enable row level security;

drop policy if exists "Users create listing requests" on public.listing_management_requests;
create policy "Users create listing requests" on public.listing_management_requests
  for insert to authenticated
  with check (requester_user_id = auth.uid() and status = 'pending');

drop policy if exists "Users read own listing requests" on public.listing_management_requests;
create policy "Users read own listing requests" on public.listing_management_requests
  for select to authenticated
  using (requester_user_id = auth.uid());

drop policy if exists "Users update requested information" on public.listing_management_requests;
create policy "Users update requested information" on public.listing_management_requests
  for update to authenticated
  using (requester_user_id = auth.uid() and status = 'needs_information')
  with check (requester_user_id = auth.uid() and status = 'pending');

drop policy if exists "Admins manage listing requests" on public.listing_management_requests;
create policy "Admins manage listing requests" on public.listing_management_requests
  for all to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%'))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%'));

drop policy if exists "Managers read own listing access" on public.listing_managers;
create policy "Managers read own listing access" on public.listing_managers
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admins manage listing access" on public.listing_managers;
create policy "Admins manage listing access" on public.listing_managers
  for all to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%'))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%'));

comment on table public.listing_management_requests is 'Moderated claim, correction, and removal requests for public event, influencer, and community-group listings.';
comment on table public.listing_managers is 'Verified user access to managed public listings; polymorphic by entity_type and entity_id.';

create or replace function public.review_listing_management_request(
  request_id uuid,
  next_status text,
  review_notes text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.listing_management_requests%rowtype;
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%') then
    raise exception 'Studio admin access required';
  end if;
  if next_status not in ('pending', 'needs_information', 'approved', 'rejected') then
    raise exception 'Invalid review status';
  end if;

  select * into request_row from public.listing_management_requests where id = request_id for update;
  if not found then raise exception 'Listing request not found'; end if;

  if next_status = 'approved' and request_row.request_type = 'claim' then
    insert into public.listing_managers(entity_type, entity_id, user_id, role, verified_by, verified_at, active)
    values (request_row.entity_type, request_row.entity_id, request_row.requester_user_id, 'owner', auth.uid(), now(), true)
    on conflict (entity_type, entity_id, user_id) do update
      set role = 'owner', verified_by = auth.uid(), verified_at = now(), active = true;

    if request_row.entity_type = 'event' then
      update public.events set created_by = request_row.requester_user_id where id = request_row.entity_id;
    elsif request_row.entity_type = 'influencer' then
      update public.influencer_profiles set user_id = request_row.requester_user_id where id = request_row.entity_id;
    else
      update public.community_groups set submitted_by = request_row.requester_user_id where id = request_row.entity_id;
    end if;
  elsif next_status = 'approved' and request_row.request_type = 'removal' then
    if request_row.entity_type = 'event' then
      update public.events set status = 'rejected', approved = false where id = request_row.entity_id;
    elsif request_row.entity_type = 'influencer' then
      update public.influencer_profiles set status = 'hidden', public_listing = false where id = request_row.entity_id;
    else
      update public.community_groups set status = 'rejected', approved = false where id = request_row.entity_id;
    end if;
  end if;

  update public.listing_management_requests
  set status = next_status, admin_notes = nullif(trim(review_notes), ''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = request_id;
end;
$$;

revoke all on function public.review_listing_management_request(uuid, text, text) from public;
grant execute on function public.review_listing_management_request(uuid, text, text) to authenticated;
