alter table public.event_ticket_settings add column if not exists test_mode boolean not null default false, add column if not exists test_access_emails text[] not null default '{}';
create or replace function public.can_view_ticket_test_event(target_event_id uuid) returns boolean language sql stable security definer set search_path=public as $$
select not exists(select 1 from public.event_ticket_settings s where s.event_id=target_event_id and s.test_mode)
or public.sdtv_is_admin()
or exists(select 1 from public.event_ticket_settings s where s.event_id=target_event_id and s.test_mode and (lower(coalesce(auth.jwt()->>'email',''))=any(select lower(unnest(s.test_access_emails))) or public.sdtv_manages_organization(s.organization_id,s.site_id)));
$$;
revoke all on function public.can_view_ticket_test_event(uuid) from public;
grant execute on function public.can_view_ticket_test_event(uuid) to anon,authenticated;
alter table public.events enable row level security;
drop policy if exists "private ticket events restricted" on public.events;
create policy "private ticket events restricted" on public.events as restrictive for select using (public.can_view_ticket_test_event(id));
comment on column public.event_ticket_settings.test_mode is 'Restricts the entire linked event to admins, organization managers, and allowlisted testers.';
