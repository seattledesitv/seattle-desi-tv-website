-- Assign events to a Desi TV market without changing existing Seattle content.

create or replace function public.current_site_id(site_code text default 'sea')
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select id from public.sites where code = lower(site_code) limit 1
$$;

alter table public.events
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.events
set site_id = (select id from public.sites where code = 'sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.events where site_id is null) then
    raise exception 'Cannot require events.site_id because one or more events could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.events
  alter column site_id set not null;

alter table public.events
  alter column site_id set default public.current_site_id('sea');

create index if not exists events_site_status_date_idx
  on public.events (site_id, status, date);

create index if not exists events_site_featured_date_idx
  on public.events (site_id, featured, date)
  where featured = true;

comment on column public.events.site_id is
  'Market that owns and publishes this event. Existing rows were assigned to Seattle during migration.';
