-- Event video publishing analytics fields for Seattle Desi TV
-- Run this in Supabase SQL editor after event-video-production.sql.

alter table public.event_video_workflows
  add column if not exists youtube_video_id text,
  add column if not exists youtube_view_count bigint default 0,
  add column if not exists youtube_like_count bigint default 0,
  add column if not exists youtube_comment_count bigint default 0,
  add column if not exists youtube_stats_updated_at timestamptz,
  add column if not exists instagram_media_id text,
  add column if not exists instagram_view_count bigint default 0,
  add column if not exists instagram_like_count bigint default 0,
  add column if not exists instagram_comment_count bigint default 0,
  add column if not exists instagram_stats_updated_at timestamptz,
  add column if not exists total_view_count bigint default 0,
  add column if not exists total_like_count bigint default 0,
  add column if not exists analytics_updated_at timestamptz;

create index if not exists event_video_workflows_youtube_video_id_idx on public.event_video_workflows(youtube_video_id);
create index if not exists event_video_workflows_instagram_media_id_idx on public.event_video_workflows(instagram_media_id);
create index if not exists event_video_workflows_analytics_updated_idx on public.event_video_workflows(analytics_updated_at);

comment on column public.event_video_workflows.youtube_video_id is 'Parsed YouTube video ID used by the stats updater.';
comment on column public.event_video_workflows.instagram_media_id is 'Instagram Graph API media ID used by the stats updater. Public post URLs alone are not always enough.';
comment on column public.event_video_workflows.analytics_updated_at is 'Last time any social analytics were refreshed.';
