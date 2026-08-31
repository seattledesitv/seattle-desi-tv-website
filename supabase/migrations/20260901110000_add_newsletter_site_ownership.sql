-- Give each market independent newsletter subscribers, settings, and campaigns.

alter table public.newsletter_subscribers
  add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.newsletter_settings
  add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.newsletter_campaigns
  add column if not exists site_id uuid references public.sites(id) on delete cascade;

update public.newsletter_subscribers set site_id = public.current_site_id('sea') where site_id is null;
update public.newsletter_settings set site_id = public.current_site_id('sea') where site_id is null;
update public.newsletter_campaigns set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.newsletter_subscribers where site_id is null)
     or exists (select 1 from public.newsletter_settings where site_id is null)
     or exists (select 1 from public.newsletter_campaigns where site_id is null) then
    raise exception 'Newsletter records could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.newsletter_subscribers alter column site_id set not null;
alter table public.newsletter_subscribers alter column site_id set default public.current_site_id('sea');
alter table public.newsletter_settings alter column site_id set not null;
alter table public.newsletter_settings alter column site_id set default public.current_site_id('sea');
alter table public.newsletter_campaigns alter column site_id set not null;
alter table public.newsletter_campaigns alter column site_id set default public.current_site_id('sea');

alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_email_key;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_site_email_key unique (site_id, email);
alter table public.newsletter_settings drop constraint if exists newsletter_settings_section_key_key;
alter table public.newsletter_settings
  add constraint newsletter_settings_site_section_key unique (site_id, section_key);

create index if not exists newsletter_subscribers_site_status_idx
  on public.newsletter_subscribers (site_id, status);
create index if not exists newsletter_settings_site_order_idx
  on public.newsletter_settings (site_id, display_order);
create index if not exists newsletter_campaigns_site_updated_idx
  on public.newsletter_campaigns (site_id, updated_at desc);

comment on column public.newsletter_subscribers.site_id is 'Market whose newsletter list contains this subscriber.';
comment on column public.newsletter_settings.site_id is 'Market whose newsletter uses this section configuration.';
comment on column public.newsletter_campaigns.site_id is 'Market that owns this newsletter campaign.';
