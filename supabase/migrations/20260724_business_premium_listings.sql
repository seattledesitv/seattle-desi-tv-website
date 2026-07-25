-- Paid/premium placement controls for the SDTV business directory.
alter table public.local_businesses
  add column if not exists is_premium boolean not null default false,
  add column if not exists premium_rank integer not null default 100,
  add column if not exists premium_starts_at timestamptz,
  add column if not exists premium_ends_at timestamptz,
  add column if not exists premium_label text,
  add column if not exists premium_payment_reference text,
  add column if not exists premium_notes text,
  add column if not exists premium_updated_at timestamptz,
  add column if not exists premium_updated_by uuid;

alter table public.local_businesses drop constraint if exists local_businesses_premium_rank_check;
alter table public.local_businesses
  add constraint local_businesses_premium_rank_check
  check (premium_rank between 0 and 9999);

create index if not exists local_businesses_premium_directory_idx
  on public.local_businesses (is_premium, premium_rank, premium_ends_at);

comment on column public.local_businesses.is_premium is 'Admin-controlled paid/premium placement flag.';
comment on column public.local_businesses.premium_rank is 'Lower values appear first among active premium listings.';
comment on column public.local_businesses.premium_ends_at is 'Optional expiry; expired premium listings automatically return to standard placement.';
comment on column public.local_businesses.premium_payment_reference is 'Internal payment/invoice reference; never shown publicly.';
