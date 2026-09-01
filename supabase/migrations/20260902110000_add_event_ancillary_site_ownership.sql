-- Give every event-adjacent operational record explicit market ownership.

alter table public.event_influencer_intents add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.event_coverage_sources add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.event_influencer_intents child
set site_id = parent.site_id
from public.events parent
where child.event_id = parent.id and child.site_id is null;

update public.event_coverage_sources child
set site_id = parent.site_id
from public.events parent
where child.event_id = parent.id and child.site_id is null;

do $$
begin
  if exists (select 1 from public.event_influencer_intents where site_id is null)
     or exists (select 1 from public.event_coverage_sources where site_id is null) then
    raise exception 'Ancillary event records could not be assigned to their parent event site.';
  end if;
end
$$;

alter table public.event_influencer_intents alter column site_id set not null;
alter table public.event_coverage_sources alter column site_id set not null;

drop trigger if exists set_event_influencer_intent_site on public.event_influencer_intents;
create trigger set_event_influencer_intent_site
before insert or update of event_id, site_id on public.event_influencer_intents
for each row execute function public.set_event_child_site_id();

drop trigger if exists set_event_coverage_source_site on public.event_coverage_sources;
create trigger set_event_coverage_source_site
before insert or update of event_id, site_id on public.event_coverage_sources
for each row execute function public.set_event_child_site_id();

create index if not exists event_influencer_intents_site_status_idx
  on public.event_influencer_intents (site_id, status, created_at desc);
create index if not exists event_coverage_sources_site_status_idx
  on public.event_coverage_sources (site_id, status, created_at desc);

comment on column public.event_influencer_intents.site_id is 'Market inherited from the parent event.';
comment on column public.event_coverage_sources.site_id is 'Market inherited from the parent event.';
