alter table public.community_stories
  add column if not exists instagram_permalink text,
  add column if not exists instagram_media_id text,
  add column if not exists instagram_published_at timestamptz,
  add column if not exists instagram_published_by uuid references auth.users(id) on delete set null;

comment on column public.community_stories.instagram_permalink is
  'Public Instagram permalink created by a super administrator for this story.';
