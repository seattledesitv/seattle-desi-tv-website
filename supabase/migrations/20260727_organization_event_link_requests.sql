create table if not exists public.organization_event_link_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.community_organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  relationship text not null default 'Organizer',
  request_notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_id, requested_by)
);

create index if not exists organization_event_link_requests_org_idx on public.organization_event_link_requests(organization_id, status);
create index if not exists organization_event_link_requests_event_idx on public.organization_event_link_requests(event_id, status);
create index if not exists organization_event_link_requests_user_idx on public.organization_event_link_requests(requested_by, created_at desc);

alter table public.organization_event_link_requests enable row level security;

drop policy if exists "organization event link requests submit own" on public.organization_event_link_requests;
create policy "organization event link requests submit own"
on public.organization_event_link_requests for insert
to authenticated
with check (
  requested_by = auth.uid()
  and (
    exists (
      select 1 from public.organization_managers om
      where om.organization_id = organization_event_link_requests.organization_id
        and om.user_id = auth.uid()
        and om.active = true
    )
    or exists (
      select 1 from public.community_organizations co
      where co.id = organization_event_link_requests.organization_id
        and co.submitted_by = auth.uid()
    )
  )
);

drop policy if exists "organization event link requests read own" on public.organization_event_link_requests;
create policy "organization event link requests read own"
on public.organization_event_link_requests for select
to authenticated
using (
  requested_by = auth.uid()
  or exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
  )
);

drop policy if exists "organization event link requests revise own pending" on public.organization_event_link_requests;
create policy "organization event link requests revise own pending"
on public.organization_event_link_requests for update
to authenticated
using (requested_by = auth.uid() and status = 'pending')
with check (requested_by = auth.uid() and status = 'pending');

drop policy if exists "organization event link requests admins update" on public.organization_event_link_requests;
create policy "organization event link requests admins update"
on public.organization_event_link_requests for update
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
  )
)
with check (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
  )
);
