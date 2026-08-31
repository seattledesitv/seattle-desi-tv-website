-- Route website and influencer inquiries to the market where they were submitted.

alter table public.contact_requests
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.contact_requests set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.contact_requests where site_id is null) then
    raise exception 'Contact requests could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.contact_requests alter column site_id set not null;
alter table public.contact_requests alter column site_id set default public.current_site_id('sea');

create index if not exists contact_requests_site_status_created_idx
  on public.contact_requests (site_id, status, created_at desc);
create index if not exists contact_requests_site_email_created_idx
  on public.contact_requests (site_id, lower(email), created_at desc);

comment on column public.contact_requests.site_id is 'Market that received and manages this inquiry.';
