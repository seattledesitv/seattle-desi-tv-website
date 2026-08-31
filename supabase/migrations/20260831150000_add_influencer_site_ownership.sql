-- Assign influencer profiles to a Desi TV market.

alter table public.influencer_profiles
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.influencer_profiles
set site_id = public.current_site_id('sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.influencer_profiles where site_id is null) then
    raise exception 'Influencer profiles could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.influencer_profiles alter column site_id set not null;
alter table public.influencer_profiles alter column site_id set default public.current_site_id('sea');

create index if not exists influencer_profiles_site_status_name_idx
  on public.influencer_profiles (site_id, status, full_name);

comment on column public.influencer_profiles.site_id is 'Market that owns and publishes this influencer profile.';
