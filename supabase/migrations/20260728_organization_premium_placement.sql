-- Premium directory placement for community organizations.
-- Homepage hero placement reuses homepage_hero_banners with banner_type = 'organization'.

alter table if exists public.community_organizations
  add column if not exists is_premium boolean not null default false,
  add column if not exists premium_rank integer not null default 100,
  add column if not exists premium_starts_at timestamptz,
  add column if not exists premium_ends_at timestamptz,
  add column if not exists premium_label text not null default 'Premium',
  add column if not exists premium_payment_reference text,
  add column if not exists premium_notes text,
  add column if not exists premium_updated_at timestamptz,
  add column if not exists premium_updated_by uuid;

create index if not exists community_organizations_premium_active_idx
  on public.community_organizations (is_premium, premium_rank, premium_starts_at, premium_ends_at)
  where status = 'approved' and approved = true;

-- Keep the shared hero table compatible with organization banners.
-- Existing banner_type columns are text in the current application model, so no table change is required.
