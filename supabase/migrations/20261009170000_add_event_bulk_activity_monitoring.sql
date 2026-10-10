alter table public.engagement_events
  add column if not exists visitor_hash text,
  add column if not exists user_agent text,
  add column if not exists referrer text;

create index if not exists engagement_events_event_session_idx
  on public.engagement_events(site_id, entity_type, session_id, created_at desc);

comment on column public.engagement_events.visitor_hash is
  'One-way, day-scoped identifier derived from the request address. Raw addresses are not stored.';
comment on column public.engagement_events.user_agent is
  'Browser or automation user-agent supplied with an engagement request.';
comment on column public.engagement_events.referrer is
  'Public referrer reported by the visitor browser.';

create or replace function public.get_event_bulk_activity(
  p_site_id uuid,
  p_since timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select
      coalesce(nullif(session_id, ''), nullif(visitor_hash, ''), 'unknown') as visitor_key,
      entity_id,
      action_type,
      created_at,
      nullif(user_agent, '') as user_agent,
      nullif(referrer, '') as referrer
    from public.engagement_events
    where site_id = p_site_id
      and entity_type = 'event'
      and created_at >= p_since
  ),
  session_rollup as (
    select
      visitor_key,
      min(created_at) as first_seen,
      max(created_at) as last_seen,
      count(*)::bigint as activity_count,
      count(*) filter (where action_type = 'page_view')::bigint as page_views,
      count(*) filter (where action_type = 'media_view')::bigint as media_views,
      count(distinct entity_id) filter (where entity_id is not null)::bigint as distinct_events,
      max(user_agent) as user_agent,
      max(referrer) as referrer
    from filtered
    where visitor_key <> 'unknown'
    group by visitor_key
  ),
  flagged as (
    select *,
      case
        when distinct_events >= 20 or activity_count >= 50 or media_views >= 25 then 'high'
        when distinct_events >= 12 or activity_count >= 35 or media_views >= 15 then 'medium'
        else 'low'
      end as severity,
      case
        when distinct_events >= 8 then 'Many different event pages viewed'
        when media_views >= 10 then 'Repeated event media activity'
        else 'High volume of event interactions'
      end as reason
    from session_rollup
    where
      (distinct_events >= 8 and last_seen - first_seen <= interval '60 minutes')
      or (media_views >= 10 and last_seen - first_seen <= interval '30 minutes')
      or (activity_count >= 25 and last_seen - first_seen <= interval '30 minutes')
    order by last_seen desc
    limit 100
  ),
  event_rollup as (
    select
      entity_id,
      count(*)::bigint as activity_count,
      count(*) filter (where action_type = 'page_view')::bigint as page_views,
      count(*) filter (where action_type = 'media_view')::bigint as media_views,
      count(distinct nullif(visitor_key, 'unknown'))::bigint as visitors
    from filtered
    where entity_id is not null
    group by entity_id
    order by activity_count desc
    limit 20
  )
  select jsonb_build_object(
    'flaggedCount', (select count(*) from flagged),
    'highCount', (select count(*) from flagged where severity = 'high'),
    'mediumCount', (select count(*) from flagged where severity = 'medium'),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'visitorKey', left(visitor_key, 10),
        'firstSeen', first_seen,
        'lastSeen', last_seen,
        'activityCount', activity_count,
        'pageViews', page_views,
        'mediaViews', media_views,
        'distinctEvents', distinct_events,
        'userAgent', user_agent,
        'referrer', referrer,
        'severity', severity,
        'reason', reason
      ) order by last_seen desc)
      from flagged
    ), '[]'::jsonb),
    'topEvents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'eventId', entity_id,
        'activityCount', activity_count,
        'pageViews', page_views,
        'mediaViews', media_views,
        'visitors', visitors
      ) order by activity_count desc)
      from event_rollup
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_event_bulk_activity(uuid, timestamptz) to authenticated;

comment on function public.get_event_bulk_activity(uuid, timestamptz) is
  'Read-only event activity signals for Studio awareness. It does not block, challenge, or rate-limit visitors.';
