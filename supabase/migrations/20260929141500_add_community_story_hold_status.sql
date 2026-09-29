alter table public.community_stories
  drop constraint if exists community_stories_status_check;

alter table public.community_stories
  add constraint community_stories_status_check
  check (status in ('draft','published','on_hold','archived'));

comment on column public.community_stories.status is
  'published is public; on_hold and archived are hidden while preserving the editorial audit record.';
