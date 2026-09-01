-- Keep listing ownership, reviews, suggestions, and claims within their parent market.
-- The parent-column setup is repeated intentionally so this migration can repair
-- an environment where an earlier multi-city migration was skipped.

alter table public.local_businesses
  add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.community_organizations
  add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.events
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.local_businesses set site_id = public.current_site_id('sea') where site_id is null;
update public.community_organizations set site_id = public.current_site_id('sea') where site_id is null;
update public.events set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.local_businesses where site_id is null)
     or exists (select 1 from public.community_organizations where site_id is null)
     or exists (select 1 from public.events where site_id is null) then
    raise exception 'Parent listings could not be assigned to Seattle. Confirm the sites registry and sea site exist.';
  end if;
end
$$;

alter table public.local_businesses alter column site_id set not null;
alter table public.local_businesses alter column site_id set default public.current_site_id('sea');
alter table public.community_organizations alter column site_id set not null;
alter table public.community_organizations alter column site_id set default public.current_site_id('sea');
alter table public.events alter column site_id set not null;
alter table public.events alter column site_id set default public.current_site_id('sea');

alter table public.business_claim_requests add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.business_managers add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.business_edit_suggestions add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.business_reviews add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.organization_claim_requests add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.organization_managers add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.organization_edit_suggestions add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.organization_event_link_requests add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.event_organizations add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.business_claim_requests child set site_id = parent.site_id from public.local_businesses parent where child.business_id = parent.id and child.site_id is null;
update public.business_managers child set site_id = parent.site_id from public.local_businesses parent where child.business_id = parent.id and child.site_id is null;
update public.business_edit_suggestions child set site_id = parent.site_id from public.local_businesses parent where child.business_id = parent.id and child.site_id is null;
update public.business_reviews child set site_id = parent.site_id from public.local_businesses parent where child.business_id = parent.id and child.site_id is null;
update public.organization_claim_requests child set site_id = parent.site_id from public.community_organizations parent where child.organization_id = parent.id and child.site_id is null;
update public.organization_managers child set site_id = parent.site_id from public.community_organizations parent where child.organization_id = parent.id and child.site_id is null;
update public.organization_edit_suggestions child set site_id = parent.site_id from public.community_organizations parent where child.organization_id = parent.id and child.site_id is null;
update public.organization_event_link_requests child set site_id = parent.site_id from public.community_organizations parent where child.organization_id = parent.id and child.site_id is null;
update public.event_organizations child set site_id = parent.site_id from public.events parent where child.event_id = parent.id and child.site_id is null;

do $$
begin
  if exists (select 1 from public.business_claim_requests where site_id is null)
     or exists (select 1 from public.business_managers where site_id is null)
     or exists (select 1 from public.business_edit_suggestions where site_id is null)
     or exists (select 1 from public.business_reviews where site_id is null)
     or exists (select 1 from public.organization_claim_requests where site_id is null)
     or exists (select 1 from public.organization_managers where site_id is null)
     or exists (select 1 from public.organization_edit_suggestions where site_id is null)
     or exists (select 1 from public.organization_event_link_requests where site_id is null)
     or exists (select 1 from public.event_organizations where site_id is null) then
    raise exception 'Claim or review records could not be assigned to their parent listing site.';
  end if;
end
$$;

alter table public.business_claim_requests alter column site_id set not null;
alter table public.business_managers alter column site_id set not null;
alter table public.business_edit_suggestions alter column site_id set not null;
alter table public.business_reviews alter column site_id set not null;
alter table public.organization_claim_requests alter column site_id set not null;
alter table public.organization_managers alter column site_id set not null;
alter table public.organization_edit_suggestions alter column site_id set not null;
alter table public.organization_event_link_requests alter column site_id set not null;
alter table public.event_organizations alter column site_id set not null;

create or replace function public.set_business_child_site_id()
returns trigger language plpgsql set search_path = public as $$
begin
  select site_id into new.site_id from public.local_businesses where id = new.business_id;
  if new.site_id is null then raise exception 'Parent business has no site ownership.'; end if;
  return new;
end
$$;

create or replace function public.set_organization_child_site_id()
returns trigger language plpgsql set search_path = public as $$
begin
  select site_id into new.site_id from public.community_organizations where id = new.organization_id;
  if new.site_id is null then raise exception 'Parent organization has no site ownership.'; end if;
  return new;
end
$$;

create or replace function public.set_organization_event_link_site_id()
returns trigger language plpgsql set search_path = public as $$
declare organization_site uuid; event_site uuid;
begin
  select site_id into organization_site from public.community_organizations where id = new.organization_id;
  select site_id into event_site from public.events where id = new.event_id;
  if organization_site is null or event_site is null or organization_site <> event_site then
    raise exception 'Organization and event must belong to the same site.';
  end if;
  new.site_id := organization_site;
  return new;
end
$$;

drop trigger if exists set_business_claim_site on public.business_claim_requests;
create trigger set_business_claim_site before insert or update of business_id, site_id on public.business_claim_requests for each row execute function public.set_business_child_site_id();
drop trigger if exists set_business_manager_site on public.business_managers;
create trigger set_business_manager_site before insert or update of business_id, site_id on public.business_managers for each row execute function public.set_business_child_site_id();
drop trigger if exists set_business_suggestion_site on public.business_edit_suggestions;
create trigger set_business_suggestion_site before insert or update of business_id, site_id on public.business_edit_suggestions for each row execute function public.set_business_child_site_id();
drop trigger if exists set_business_review_site on public.business_reviews;
create trigger set_business_review_site before insert or update of business_id, site_id on public.business_reviews for each row execute function public.set_business_child_site_id();
drop trigger if exists set_organization_claim_site on public.organization_claim_requests;
create trigger set_organization_claim_site before insert or update of organization_id, site_id on public.organization_claim_requests for each row execute function public.set_organization_child_site_id();
drop trigger if exists set_organization_manager_site on public.organization_managers;
create trigger set_organization_manager_site before insert or update of organization_id, site_id on public.organization_managers for each row execute function public.set_organization_child_site_id();
drop trigger if exists set_organization_suggestion_site on public.organization_edit_suggestions;
create trigger set_organization_suggestion_site before insert or update of organization_id, site_id on public.organization_edit_suggestions for each row execute function public.set_organization_child_site_id();
drop trigger if exists set_organization_event_link_site on public.organization_event_link_requests;
create trigger set_organization_event_link_site before insert or update of organization_id, event_id, site_id on public.organization_event_link_requests for each row execute function public.set_organization_event_link_site_id();
drop trigger if exists set_event_organization_site on public.event_organizations;
create trigger set_event_organization_site before insert or update of organization_id, event_id, site_id on public.event_organizations for each row execute function public.set_organization_event_link_site_id();

create index if not exists business_claims_site_status_idx on public.business_claim_requests (site_id, status, created_at desc);
create index if not exists business_managers_site_user_idx on public.business_managers (site_id, user_id, active);
create index if not exists business_suggestions_site_status_idx on public.business_edit_suggestions (site_id, status, created_at desc);
create index if not exists business_reviews_site_status_idx on public.business_reviews (site_id, status, created_at desc);
create index if not exists organization_claims_site_status_idx on public.organization_claim_requests (site_id, status, created_at desc);
create index if not exists organization_managers_site_user_idx on public.organization_managers (site_id, user_id, active);
create index if not exists organization_suggestions_site_status_idx on public.organization_edit_suggestions (site_id, status, created_at desc);
create index if not exists organization_event_links_site_status_idx on public.organization_event_link_requests (site_id, status, created_at desc);
create index if not exists event_organizations_site_event_idx on public.event_organizations (site_id, event_id, display_order);
