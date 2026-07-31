alter table public.community_organizations enable row level security;

-- Verified organization managers may read the organization rows connected to them.
drop policy if exists "organization managers read managed organizations" on public.community_organizations;
create policy "organization managers read managed organizations"
on public.community_organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_managers manager
    where manager.organization_id = community_organizations.id
      and manager.user_id = auth.uid()
      and manager.active = true
  )
  or submitted_by = auth.uid()
  or approved = true
  or exists (
    select 1 from public.admins admin
    where admin.user_id = auth.uid()
       or lower(admin.email) = lower(auth.jwt()->>'email')
  )
);

-- Submitted owners and verified managers may maintain profile and media fields.
-- Approval state remains controlled by Studio because the client update payload does not include it.
drop policy if exists "organization managers update managed organizations" on public.community_organizations;
create policy "organization managers update managed organizations"
on public.community_organizations
for update
to authenticated
using (
  submitted_by = auth.uid()
  or exists (
    select 1
    from public.organization_managers manager
    where manager.organization_id = community_organizations.id
      and manager.user_id = auth.uid()
      and manager.active = true
  )
  or exists (
    select 1 from public.admins admin
    where admin.user_id = auth.uid()
       or lower(admin.email) = lower(auth.jwt()->>'email')
  )
)
with check (
  submitted_by = auth.uid()
  or exists (
    select 1
    from public.organization_managers manager
    where manager.organization_id = community_organizations.id
      and manager.user_id = auth.uid()
      and manager.active = true
  )
  or exists (
    select 1 from public.admins admin
    where admin.user_id = auth.uid()
       or lower(admin.email) = lower(auth.jwt()->>'email')
  )
);
