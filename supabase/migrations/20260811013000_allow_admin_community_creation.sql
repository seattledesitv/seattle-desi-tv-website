-- Studio administrators may create claimable community groups and organizations.
alter table public.community_groups enable row level security;
alter table public.community_organizations enable row level security;

drop policy if exists "Admins create community groups" on public.community_groups;
create policy "Admins create community groups" on public.community_groups
for insert to authenticated with check (public.is_sdtv_admin());

drop policy if exists "Admins create community organizations" on public.community_organizations;
create policy "Admins create community organizations" on public.community_organizations
for insert to authenticated with check (public.is_sdtv_admin());

comment on table public.community_groups is 'Community-submitted and Studio-created groups supporting moderated claims.';
comment on table public.community_organizations is 'Community-submitted and Studio-created organizations supporting moderated management claims.';
