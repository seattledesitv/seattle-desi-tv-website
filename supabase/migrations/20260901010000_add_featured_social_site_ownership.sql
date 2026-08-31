-- Assign curated social and TV highlights to a Desi TV market.

alter table public.featured_social_content
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.featured_social_content
set site_id = public.current_site_id('sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.featured_social_content where site_id is null) then
    raise exception 'Featured social content could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.featured_social_content alter column site_id set not null;
alter table public.featured_social_content alter column site_id set default public.current_site_id('sea');

create index if not exists featured_social_content_site_public_idx
  on public.featured_social_content (site_id, active, featured, display_order, created_at desc);

comment on column public.featured_social_content.site_id is 'Market that owns and publishes this curated social highlight.';
