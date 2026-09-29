create table if not exists public.community_stories (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  source_request_id uuid not null references public.public_content_requests(id) on delete restrict,
  slug text not null,
  title text not null,
  summary text,
  body text not null,
  author_name text,
  category text not null default 'Community Story',
  location text,
  image_urls text[] not null default '{}',
  video_url text,
  source_url text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, source_request_id),
  unique (site_id, slug)
);

create index if not exists community_stories_site_published_idx
  on public.community_stories (site_id, published_at desc)
  where status = 'published';

alter table public.community_stories enable row level security;

drop policy if exists "Public reads published community stories" on public.community_stories;
create policy "Public reads published community stories"
  on public.community_stories for select to anon, authenticated
  using (status = 'published' and published_at <= now());

drop policy if exists "Admins manage community stories" on public.community_stories;
create policy "Admins manage community stories"
  on public.community_stories for all to authenticated
  using (public.sdtv_is_admin())
  with check (public.sdtv_is_admin());

create or replace function public.publish_community_story(
  request_id uuid,
  story_slug text,
  story_title text,
  story_summary text,
  story_body text,
  story_author_name text,
  story_category text,
  story_location text,
  story_image_urls text[],
  story_video_url text,
  story_source_url text
)
returns public.community_stories
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.public_content_requests;
  story_row public.community_stories;
  safe_slug text;
begin
  if not public.sdtv_is_admin() then
    raise exception 'Admin approval is required to publish a community story.';
  end if;

  select * into request_row from public.public_content_requests where id = request_id for update;
  if request_row.id is null then raise exception 'Community submission not found.'; end if;
  if request_row.status not in ('approved_for_publishing', 'published') then
    raise exception 'Approve this submission before publishing it as a story.';
  end if;
  if nullif(trim(story_title), '') is null or nullif(trim(story_body), '') is null then
    raise exception 'A public headline and story body are required.';
  end if;

  safe_slug := trim(both '-' from regexp_replace(lower(coalesce(nullif(trim(story_slug), ''), story_title)), '[^a-z0-9]+', '-', 'g'));
  if safe_slug = '' then safe_slug := 'community-story'; end if;
  safe_slug := safe_slug || '-' || left(replace(request_id::text, '-', ''), 8);

  insert into public.community_stories (
    site_id, source_request_id, slug, title, summary, body, author_name, category,
    location, image_urls, video_url, source_url, status, published_at, created_by, approved_by
  ) values (
    request_row.site_id, request_id, safe_slug, trim(story_title), nullif(trim(story_summary), ''),
    trim(story_body), nullif(trim(story_author_name), ''), coalesce(nullif(trim(story_category), ''), 'Community Story'),
    nullif(trim(story_location), ''), coalesce(story_image_urls, '{}'), nullif(trim(story_video_url), ''),
    nullif(trim(story_source_url), ''), 'published', now(), auth.uid(), auth.uid()
  )
  on conflict (site_id, source_request_id) do update set
    title = excluded.title, summary = excluded.summary, body = excluded.body,
    author_name = excluded.author_name, category = excluded.category, location = excluded.location,
    image_urls = excluded.image_urls, video_url = excluded.video_url, source_url = excluded.source_url,
    status = 'published', published_at = coalesce(community_stories.published_at, now()),
    approved_by = auth.uid(), updated_at = now()
  returning * into story_row;

  update public.public_content_requests set
    status = 'published', approved_at = coalesce(approved_at, now()), published_at = now(),
    final_website_url = '/news/stories/' || story_row.slug, updated_at = now()
  where id = request_id;

  return story_row;
end;
$$;

revoke all on function public.publish_community_story(uuid,text,text,text,text,text,text,text,text[],text,text) from public;
grant execute on function public.publish_community_story(uuid,text,text,text,text,text,text,text,text[],text,text) to authenticated;

comment on table public.community_stories is 'Sanitized, admin-approved local news and community stories published by SDTV.';
