-- Multi-city foundation only.
--
-- This migration intentionally does not modify existing content tables or
-- application behavior. It creates the site/domain registry and reserves the
-- initial Seattle, San Francisco, and Dallas identities so later migrations
-- can add site ownership one module at a time.

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  slug text not null unique,
  name text not null,
  short_name text not null,
  city text not null,
  state_code text not null,
  timezone text not null,
  status text not null default 'planned',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sites_code_format_check check (code ~ '^[a-z0-9_]+$'),
  constraint sites_slug_format_check check (slug ~ '^[a-z0-9-]+$'),
  constraint sites_status_check check (status in ('planned', 'active', 'on_hold', 'archived')),
  constraint sites_settings_object_check check (jsonb_typeof(settings) = 'object')
);

create table if not exists public.site_domains (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  hostname text not null unique,
  is_primary boolean not null default false,
  redirect_to_primary boolean not null default false,
  environment text not null default 'production',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_domains_hostname_lowercase_check check (hostname = lower(hostname)),
  constraint site_domains_hostname_origin_check check (
    hostname !~ '://' and hostname !~ '/' and hostname <> ''
  ),
  constraint site_domains_environment_check check (environment in ('production', 'preview', 'development')),
  constraint site_domains_redirect_check check (not (is_primary and redirect_to_primary))
);

create unique index if not exists site_domains_one_primary_per_site_environment_idx
  on public.site_domains (site_id, environment)
  where is_primary and active;

create index if not exists site_domains_site_id_idx
  on public.site_domains (site_id);

alter table public.sites enable row level security;
alter table public.site_domains enable row level security;

drop policy if exists "Public can read available sites" on public.sites;
create policy "Public can read available sites"
  on public.sites
  for select
  using (status in ('planned', 'active'));

drop policy if exists "Public can resolve active site domains" on public.site_domains;
create policy "Public can resolve active site domains"
  on public.site_domains
  for select
  using (active);

insert into public.sites (
  code,
  slug,
  name,
  short_name,
  city,
  state_code,
  timezone,
  status,
  settings
)
values
  (
    'sea',
    'seattle',
    'Seattle Desi TV',
    'SDTV',
    'Seattle',
    'WA',
    'America/Los_Angeles',
    'active',
    jsonb_build_object(
      'contact_email', 'info@seattledesitv.com',
      'whatsapp_number', '+14254397388'
    )
  ),
  (
    'sfo',
    'san-francisco',
    'SFO Desi TV',
    'SFO Desi TV',
    'San Francisco',
    'CA',
    'America/Los_Angeles',
    'planned',
    '{}'::jsonb
  ),
  (
    'dal',
    'dallas',
    'Dallas Desi TV',
    'Dallas Desi TV',
    'Dallas',
    'TX',
    'America/Chicago',
    'planned',
    '{}'::jsonb
  )
on conflict (code) do update
set
  slug = excluded.slug,
  name = excluded.name,
  short_name = excluded.short_name,
  city = excluded.city,
  state_code = excluded.state_code,
  timezone = excluded.timezone,
  updated_at = now();

insert into public.site_domains (
  site_id,
  hostname,
  is_primary,
  redirect_to_primary,
  environment,
  active
)
values
  ((select id from public.sites where code = 'sea'), 'seattledesitv.com', true, false, 'production', true),
  ((select id from public.sites where code = 'sea'), 'www.seattledesitv.com', false, true, 'production', true),
  ((select id from public.sites where code = 'sfo'), 'sfodesitv.com', true, false, 'production', true),
  ((select id from public.sites where code = 'sfo'), 'www.sfodesitv.com', false, true, 'production', true),
  ((select id from public.sites where code = 'dal'), 'dallasdesitv.com', true, false, 'production', true),
  ((select id from public.sites where code = 'dal'), 'www.dallasdesitv.com', false, true, 'production', true)
on conflict (hostname) do update
set
  site_id = excluded.site_id,
  is_primary = excluded.is_primary,
  redirect_to_primary = excluded.redirect_to_primary,
  environment = excluded.environment,
  active = excluded.active,
  updated_at = now();

comment on table public.sites is
  'Market registry for the shared Desi TV platform. Public settings must never contain secrets.';

comment on table public.site_domains is
  'Maps normalized request hostnames to a site. Hostname values exclude scheme, port, path, and query.';
