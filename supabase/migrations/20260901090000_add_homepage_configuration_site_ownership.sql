-- Give each market independent homepage sections and social statistics.

alter table public.homepage_settings
  add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.social_media_stats
  add column if not exists site_id uuid references public.sites(id) on delete cascade;

update public.homepage_settings set site_id = public.current_site_id('sea') where site_id is null;
update public.social_media_stats set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.homepage_settings where site_id is null)
     or exists (select 1 from public.social_media_stats where site_id is null) then
    raise exception 'Homepage configuration could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.homepage_settings alter column site_id set not null;
alter table public.homepage_settings alter column site_id set default public.current_site_id('sea');
alter table public.social_media_stats alter column site_id set not null;
alter table public.social_media_stats alter column site_id set default public.current_site_id('sea');

alter table public.homepage_settings drop constraint if exists homepage_settings_pkey;
alter table public.homepage_settings add constraint homepage_settings_pkey primary key (site_id, section_key);
alter table public.social_media_stats drop constraint if exists social_media_stats_pkey;
alter table public.social_media_stats add constraint social_media_stats_pkey primary key (site_id, platform);

create index if not exists homepage_settings_site_order_idx
  on public.homepage_settings (site_id, display_order);

comment on column public.homepage_settings.site_id is 'Market whose homepage uses this section configuration.';
comment on column public.social_media_stats.site_id is 'Market whose homepage displays these social statistics.';
