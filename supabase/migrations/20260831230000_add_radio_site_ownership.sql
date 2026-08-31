-- Assign radio schedules and radio team profiles to a Desi TV market.

alter table public.radio_team_members
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

alter table public.radio_programs
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.radio_team_members
set site_id = public.current_site_id('sea')
where site_id is null;

update public.radio_programs
set site_id = public.current_site_id('sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.radio_team_members where site_id is null)
     or exists (select 1 from public.radio_programs where site_id is null) then
    raise exception 'Radio records could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.radio_team_members alter column site_id set not null;
alter table public.radio_team_members alter column site_id set default public.current_site_id('sea');
alter table public.radio_programs alter column site_id set not null;
alter table public.radio_programs alter column site_id set default public.current_site_id('sea');

drop index if exists public.radio_team_members_user_id_unique;
create unique index radio_team_members_site_user_id_unique
  on public.radio_team_members (site_id, user_id)
  where user_id is not null;

create index if not exists radio_team_members_site_public_idx
  on public.radio_team_members (site_id, show_on_public_radio, created_at desc);
create index if not exists radio_programs_site_status_idx
  on public.radio_programs (site_id, status, schedule_type, display_order, start_time);

create or replace function public.ensure_radio_program_host_site()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.host_id is not null and not exists (
    select 1 from public.radio_team_members host
    where host.id = new.host_id and host.site_id = new.site_id
  ) then
    raise exception 'A radio program host must belong to the same site.';
  end if;
  return new;
end;
$$;

drop trigger if exists radio_programs_host_site_guard on public.radio_programs;
create trigger radio_programs_host_site_guard
before insert or update of site_id, host_id on public.radio_programs
for each row execute function public.ensure_radio_program_host_site();

create or replace function public.protect_radio_team_site_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.site_id is distinct from new.site_id and not public.is_sdtv_admin() then
    raise exception 'Only an administrator can move a radio team profile between sites.';
  end if;
  return new;
end;
$$;

drop trigger if exists radio_team_members_site_guard on public.radio_team_members;
create trigger radio_team_members_site_guard
before update of site_id on public.radio_team_members
for each row execute function public.protect_radio_team_site_id();

comment on column public.radio_team_members.site_id is 'Market that owns this radio team profile.';
comment on column public.radio_programs.site_id is 'Market that owns and publishes this radio program.';
