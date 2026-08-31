-- Assign community organizations and groups to a Desi TV market.

alter table public.community_organizations
  add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.community_groups
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.community_organizations set site_id = public.current_site_id('sea') where site_id is null;
update public.community_groups set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.community_organizations where site_id is null)
     or exists (select 1 from public.community_groups where site_id is null) then
    raise exception 'Community records could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.community_organizations alter column site_id set not null;
alter table public.community_organizations alter column site_id set default public.current_site_id('sea');
alter table public.community_groups alter column site_id set not null;
alter table public.community_groups alter column site_id set default public.current_site_id('sea');

create index if not exists community_organizations_site_status_name_idx
  on public.community_organizations (site_id, status, name);
create index if not exists community_groups_site_status_name_idx
  on public.community_groups (site_id, status, name);

comment on column public.community_organizations.site_id is 'Market that owns and publishes this organization.';
comment on column public.community_groups.site_id is 'Market that owns and publishes this community group.';
