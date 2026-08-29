-- Assign local businesses to a Desi TV market without changing Seattle listings.

alter table public.local_businesses
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.local_businesses
set site_id = public.current_site_id('sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.local_businesses where site_id is null) then
    raise exception 'Cannot require local_businesses.site_id because one or more rows could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.local_businesses alter column site_id set not null;
alter table public.local_businesses alter column site_id set default public.current_site_id('sea');

create index if not exists local_businesses_site_status_name_idx
  on public.local_businesses (site_id, status, name);

create index if not exists local_businesses_site_premium_rank_idx
  on public.local_businesses (site_id, is_premium, premium_rank)
  where is_premium = true;

comment on column public.local_businesses.site_id is
  'Market that owns and publishes this business listing. Existing rows were assigned to Seattle.';
