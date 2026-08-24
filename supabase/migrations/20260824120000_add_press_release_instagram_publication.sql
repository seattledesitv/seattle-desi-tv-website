alter table public.press_releases
  add column if not exists instagram_permalink text,
  add column if not exists instagram_media_id text,
  add column if not exists instagram_published_at timestamptz,
  add column if not exists instagram_published_by uuid references auth.users(id) on delete set null;

alter table public.press_releases
  drop constraint if exists press_releases_instagram_permalink_https;

alter table public.press_releases
  add constraint press_releases_instagram_permalink_https
  check (instagram_permalink is null or instagram_permalink ~* '^https://(www\.)?instagram\.com/');

create index if not exists press_releases_instagram_published_idx
  on public.press_releases(instagram_published_at desc)
  where instagram_published_at is not null;

comment on column public.press_releases.instagram_permalink is 'Public Instagram permalink returned after an administrator publishes the release.';
comment on column public.press_releases.instagram_media_id is 'Instagram media identifier returned by the publishing API.';
comment on column public.press_releases.instagram_published_at is 'Time the press release was successfully published to Instagram.';
comment on column public.press_releases.instagram_published_by is 'Administrator who initiated the successful Instagram publication.';
