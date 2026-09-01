-- Separate public content intake and generic listing-management workflows by market.

-- Repair skipped parent migrations before deriving polymorphic ownership.
alter table public.events add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.influencer_profiles add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.community_groups add column if not exists site_id uuid references public.sites(id) on delete restrict;
update public.events set site_id = public.current_site_id('sea') where site_id is null;
update public.influencer_profiles set site_id = public.current_site_id('sea') where site_id is null;
update public.community_groups set site_id = public.current_site_id('sea') where site_id is null;
alter table public.events alter column site_id set not null;
alter table public.events alter column site_id set default public.current_site_id('sea');
alter table public.influencer_profiles alter column site_id set not null;
alter table public.influencer_profiles alter column site_id set default public.current_site_id('sea');
alter table public.community_groups alter column site_id set not null;
alter table public.community_groups alter column site_id set default public.current_site_id('sea');

alter table public.public_content_requests add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.listing_management_requests add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.listing_managers add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.public_content_requests set site_id = public.current_site_id('sea') where site_id is null;

create or replace function public.listing_entity_site_id(entity_kind text, entity_uuid uuid)
returns uuid language plpgsql stable set search_path = public as $$
declare result uuid;
begin
  if entity_kind = 'event' then
    select site_id into result from public.events where id = entity_uuid;
  elsif entity_kind = 'influencer' then
    select site_id into result from public.influencer_profiles where id = entity_uuid;
  elsif entity_kind = 'community_group' then
    select site_id into result from public.community_groups where id = entity_uuid;
  end if;
  return result;
end
$$;

update public.listing_management_requests
set site_id = public.listing_entity_site_id(entity_type, entity_id)
where site_id is null;
update public.listing_managers
set site_id = public.listing_entity_site_id(entity_type, entity_id)
where site_id is null;

do $$
begin
  if exists (select 1 from public.public_content_requests where site_id is null)
     or exists (select 1 from public.listing_management_requests where site_id is null)
     or exists (select 1 from public.listing_managers where site_id is null) then
    raise exception 'Submission queue records could not be assigned to a site.';
  end if;
end
$$;

alter table public.public_content_requests alter column site_id set not null;
alter table public.public_content_requests alter column site_id set default public.current_site_id('sea');
alter table public.listing_management_requests alter column site_id set not null;
alter table public.listing_managers alter column site_id set not null;

create or replace function public.set_listing_entity_site_id()
returns trigger language plpgsql set search_path = public as $$
begin
  new.site_id := public.listing_entity_site_id(new.entity_type, new.entity_id);
  if new.site_id is null then raise exception 'Managed listing has no site ownership.'; end if;
  return new;
end
$$;

drop trigger if exists set_listing_request_site on public.listing_management_requests;
create trigger set_listing_request_site before insert or update of entity_type, entity_id, site_id on public.listing_management_requests for each row execute function public.set_listing_entity_site_id();
drop trigger if exists set_listing_manager_site on public.listing_managers;
create trigger set_listing_manager_site before insert or update of entity_type, entity_id, site_id on public.listing_managers for each row execute function public.set_listing_entity_site_id();

create index if not exists public_content_requests_site_status_idx on public.public_content_requests (site_id, status, created_at desc);
create index if not exists listing_management_requests_site_status_idx on public.listing_management_requests (site_id, status, created_at desc);
create index if not exists listing_managers_site_user_idx on public.listing_managers (site_id, user_id, active);

comment on column public.public_content_requests.site_id is 'Market receiving this public content submission.';
comment on column public.listing_management_requests.site_id is 'Market owning the listing under review.';
