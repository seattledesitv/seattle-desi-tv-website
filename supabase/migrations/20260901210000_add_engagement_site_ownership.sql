-- Attribute every view and click to the market where it occurred.

alter table public.engagement_events
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

-- Historical engagement was collected only by the Seattle site.
update public.engagement_events
set site_id = public.current_site_id('sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.engagement_events where site_id is null) then
    raise exception 'Engagement events could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.engagement_events alter column site_id set not null;
alter table public.engagement_events alter column site_id set default public.current_site_id('sea');

create index if not exists engagement_events_site_created_idx
  on public.engagement_events (site_id, created_at desc);
create index if not exists engagement_events_site_entity_idx
  on public.engagement_events (site_id, entity_type, entity_id, created_at desc);
create index if not exists engagement_events_site_action_idx
  on public.engagement_events (site_id, action_type, created_at desc);

comment on column public.engagement_events.site_id is
  'Market where this page view or interaction occurred.';
