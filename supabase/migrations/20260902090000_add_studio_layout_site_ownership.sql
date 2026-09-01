-- Allow each market to control its own Team page and homepage hero layout.

alter table public.team_page_settings add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.team_page_sections add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.team_page_member_assignments add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.homepage_hero_settings add column if not exists site_id uuid references public.sites(id) on delete cascade;

update public.team_page_settings set site_id = public.current_site_id('sea') where site_id is null;
update public.team_page_sections set site_id = public.current_site_id('sea') where site_id is null;
update public.homepage_hero_settings set site_id = public.current_site_id('sea') where site_id is null;
update public.team_page_member_assignments child
set site_id = parent.site_id
from public.team_members parent
where child.member_id = parent.id and child.site_id is null;
update public.team_page_member_assignments set site_id = public.current_site_id('sea') where site_id is null;

alter table public.team_page_settings alter column site_id set not null;
alter table public.team_page_settings alter column site_id set default public.current_site_id('sea');
alter table public.team_page_sections alter column site_id set not null;
alter table public.team_page_sections alter column site_id set default public.current_site_id('sea');
alter table public.team_page_member_assignments alter column site_id set not null;
alter table public.team_page_member_assignments alter column site_id set default public.current_site_id('sea');
alter table public.homepage_hero_settings alter column site_id set not null;
alter table public.homepage_hero_settings alter column site_id set default public.current_site_id('sea');

alter table public.team_page_settings drop constraint if exists team_page_settings_pkey;
alter table public.team_page_settings add constraint team_page_settings_pkey primary key (site_id, key);
alter table public.team_page_member_assignments drop constraint if exists team_page_member_assignments_section_key_fkey;
alter table public.team_page_sections drop constraint if exists team_page_sections_pkey;
alter table public.team_page_sections add constraint team_page_sections_pkey primary key (site_id, section_key);
alter table public.team_page_member_assignments
  add constraint team_page_member_assignments_site_section_fkey
  foreign key (site_id, section_key) references public.team_page_sections(site_id, section_key) on delete cascade;
alter table public.homepage_hero_settings drop constraint if exists homepage_hero_settings_pkey;
alter table public.homepage_hero_settings add constraint homepage_hero_settings_pkey primary key (site_id, id);

drop index if exists public.team_page_member_assignments_member_id_section_key_key;
alter table public.team_page_member_assignments drop constraint if exists team_page_member_assignments_member_id_section_key_key;
create unique index team_page_member_assignments_site_member_section_unique
  on public.team_page_member_assignments (site_id, member_id, section_key);

insert into public.homepage_hero_settings (site_id, id, layout_style)
select id, 'default', 'image_focus' from public.sites
on conflict (site_id, id) do nothing;

create index if not exists team_page_member_assignments_site_idx on public.team_page_member_assignments (site_id, member_id);

comment on column public.team_page_settings.site_id is 'Market-specific Team page text setting.';
comment on column public.homepage_hero_settings.site_id is 'Market-specific homepage hero layout.';
