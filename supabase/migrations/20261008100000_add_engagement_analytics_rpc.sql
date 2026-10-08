create or replace function public.get_engagement_analytics(
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
    select entity_type, entity_id, entity_name, action_type, created_at
    from public.engagement_events
    where site_id = p_site_id
      and created_at >= p_since
  ),
  action_counts as (
    select action_type, count(*)::bigint as count
    from filtered
    group by action_type
  ),
  daily_counts as (
    select to_char(created_at at time zone 'America/Los_Angeles', 'YYYY-MM-DD') as day,
           count(*)::bigint as count
    from filtered
    group by 1
    order by 1
  ),
  entity_counts as (
    select
      entity_type,
      coalesce(nullif(entity_id, ''), nullif(entity_name, ''), 'unknown') as entity_key,
      coalesce(nullif(max(entity_name), ''), nullif(entity_id, ''), 'Unknown') as name,
      count(*) filter (where action_type = 'page_view')::bigint as views,
      count(*) filter (where action_type <> 'page_view')::bigint as clicks,
      count(*)::bigint as total
    from filtered
    group by entity_type, coalesce(nullif(entity_id, ''), nullif(entity_name, ''), 'unknown'), entity_id
    order by total desc
    limit 25
  )
  select jsonb_build_object(
    'total', (select count(*)::bigint from filtered),
    'views', (select count(*)::bigint from filtered where action_type = 'page_view'),
    'clicks', (select count(*)::bigint from filtered where action_type <> 'page_view'),
    'counts', coalesce((select jsonb_object_agg(action_type, count) from action_counts), '{}'::jsonb),
    'trend', coalesce((select jsonb_agg(jsonb_build_array(day, count) order by day) from daily_counts), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object(
      'key', entity_type || ':' || entity_key,
      'type', entity_type,
      'name', name,
      'views', views,
      'clicks', clicks,
      'total', total
    ) order by total desc) from entity_counts), '[]'::jsonb)
  );
$$;

grant execute on function public.get_engagement_analytics(uuid, timestamptz) to authenticated;

comment on function public.get_engagement_analytics(uuid, timestamptz) is
  'Returns complete site-scoped engagement totals and grouped statistics without PostgREST row-limit truncation.';
