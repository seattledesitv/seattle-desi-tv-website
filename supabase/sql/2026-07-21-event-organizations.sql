-- Event ↔ community organization relationships
create table if not exists public.event_organizations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  organization_id uuid not null references public.community_organizations(id) on delete cascade,
  relationship text not null default 'Organizer' check (relationship in ('Organizer','Co-Organizer','Community Partner','Venue Partner','Media Partner','Sponsor','Charity Partner','Educational Partner')),
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(event_id, organization_id, relationship)
);

create index if not exists event_organizations_event_idx on public.event_organizations(event_id, display_order);
create index if not exists event_organizations_org_idx on public.event_organizations(organization_id, display_order);
create unique index if not exists event_organizations_one_primary_idx on public.event_organizations(event_id) where is_primary;

alter table public.event_organizations enable row level security;

drop policy if exists "Public can read event organizations" on public.event_organizations;
create policy "Public can read event organizations"
on public.event_organizations for select
using (true);

drop policy if exists "Event submitters can link their organization" on public.event_organizations;
create policy "Event submitters can link their organization"
on public.event_organizations for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and e.created_by = auth.uid()
  )
  and exists (
    select 1 from public.community_organizations o
    where o.id = organization_id
      and (
        (o.status = 'approved' and o.approved = true)
        or o.submitted_by = auth.uid()
      )
  )
);

drop policy if exists "Event owners can update organization links" on public.event_organizations;
create policy "Event owners can update organization links"
on public.event_organizations for update
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and e.created_by = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and e.created_by = auth.uid()
  )
  and exists (
    select 1 from public.community_organizations o
    where o.id = organization_id
      and (
        (o.status = 'approved' and o.approved = true)
        or o.submitted_by = auth.uid()
      )
  )
);

drop policy if exists "Event owners can delete organization links" on public.event_organizations;
create policy "Event owners can delete organization links"
on public.event_organizations for delete
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and e.created_by = auth.uid()
  )
);

drop policy if exists "Admins can manage event organizations" on public.event_organizations;
create policy "Admins can manage event organizations"
on public.event_organizations for all
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);
