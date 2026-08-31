-- Assign homepage testimonials to a Desi TV market.

alter table public.homepage_testimonials
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.homepage_testimonials
set site_id = public.current_site_id('sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.homepage_testimonials where site_id is null) then
    raise exception 'Homepage testimonials could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.homepage_testimonials alter column site_id set not null;
alter table public.homepage_testimonials alter column site_id set default public.current_site_id('sea');

create index if not exists homepage_testimonials_site_public_idx
  on public.homepage_testimonials (site_id, active, display_order, created_at desc);

comment on column public.homepage_testimonials.site_id is 'Market where this testimonial is displayed.';
