-- SDTV Publishing Platform v2 foundation
-- Keeps the existing newsletter tables and workflows unchanged.

create extension if not exists pgcrypto;

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  edition_label text,
  publication_type text not null default 'monthly' check (publication_type in ('monthly','quarterly','six_month','annual','custom')),
  start_date date,
  end_date date,
  description text,
  status text not null default 'draft' check (status in ('draft','review','approved','scheduled','published','archived')),
  cover_image_url text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publication_sections (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  section_key text not null,
  title text not null,
  introduction text,
  included boolean not null default true,
  sort_order integer not null default 0,
  section_type text not null default 'dynamic',
  source_config jsonb not null default '{}'::jsonb,
  generated_content jsonb not null default '{}'::jsonb,
  manual_content jsonb not null default '{}'::jsonb,
  is_manually_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(publication_id, section_key)
);

create table if not exists public.publication_items (
  id uuid primary key default gen_random_uuid(),
  publication_section_id uuid not null references public.publication_sections(id) on delete cascade,
  source_type text not null,
  source_id text,
  title text,
  description text,
  image_url text,
  destination_url text,
  inclusion_status text not null default 'included' check (inclusion_status in ('included','excluded_by_editor','source_unavailable')),
  featured boolean not null default false,
  sort_order integer not null default 0,
  generated_content jsonb not null default '{}'::jsonb,
  manual_content jsonb not null default '{}'::jsonb,
  is_manually_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publication_campaigns (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid references public.publications(id) on delete cascade,
  publication_section_id uuid references public.publication_sections(id) on delete cascade,
  publication_item_id uuid references public.publication_items(id) on delete cascade,
  name text not null,
  campaign_type text not null default 'section',
  status text not null default 'draft' check (status in ('draft','review','approved','scheduled','published','archived')),
  channels text[] not null default '{}',
  scheduled_at timestamptz,
  published_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publication_outputs (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid references public.publications(id) on delete cascade,
  campaign_id uuid references public.publication_campaigns(id) on delete cascade,
  output_type text not null,
  channel text,
  status text not null default 'draft',
  content jsonb not null default '{}'::jsonb,
  asset_url text,
  published_url text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publications_status_idx on public.publications(status);
create index if not exists publications_period_idx on public.publications(start_date, end_date);
create index if not exists publication_sections_publication_idx on public.publication_sections(publication_id, sort_order);
create index if not exists publication_items_section_idx on public.publication_items(publication_section_id, sort_order);
create index if not exists publication_campaigns_publication_idx on public.publication_campaigns(publication_id, status);

alter table public.publications enable row level security;
alter table public.publication_sections enable row level security;
alter table public.publication_items enable row level security;
alter table public.publication_campaigns enable row level security;
alter table public.publication_outputs enable row level security;

-- Studio admins can manage publishing data. This follows the existing public.admins model.
drop policy if exists "Admins manage publications" on public.publications;
create policy "Admins manage publications" on public.publications for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Admins manage publication sections" on public.publication_sections;
create policy "Admins manage publication sections" on public.publication_sections for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Admins manage publication items" on public.publication_items;
create policy "Admins manage publication items" on public.publication_items for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Admins manage publication campaigns" on public.publication_campaigns;
create policy "Admins manage publication campaigns" on public.publication_campaigns for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Admins manage publication outputs" on public.publication_outputs;
create policy "Admins manage publication outputs" on public.publication_outputs for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Published website/archive editions may be read publicly.
drop policy if exists "Public reads published publications" on public.publications;
create policy "Public reads published publications" on public.publications for select to anon, authenticated
using (status = 'published');

drop policy if exists "Public reads published publication sections" on public.publication_sections;
create policy "Public reads published publication sections" on public.publication_sections for select to anon, authenticated
using (included and exists (select 1 from public.publications p where p.id = publication_id and p.status = 'published'));

drop policy if exists "Public reads published publication items" on public.publication_items;
create policy "Public reads published publication items" on public.publication_items for select to anon, authenticated
using (inclusion_status = 'included' and exists (
  select 1 from public.publication_sections s
  join public.publications p on p.id = s.publication_id
  where s.id = publication_section_id and s.included and p.status = 'published'
));
