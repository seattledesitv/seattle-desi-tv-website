-- Verified organization managers can work with events linked to their organization.
-- Moderation, placement, ownership, and site-routing fields remain admin-controlled.

drop policy if exists "event submitters update own events" on public.events;
create policy "event submitters update own events"
on public.events for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "organization managers update linked events" on public.events;
create policy "organization managers update linked events"
on public.events for update to authenticated
using (
  exists (
    select 1
    from public.event_organizations eo
    join public.organization_managers om
      on om.organization_id = eo.organization_id
     and om.site_id = eo.site_id
    where eo.event_id = events.id
      and eo.site_id = events.site_id
      and om.user_id = auth.uid()
      and om.active = true
  )
)
with check (
  exists (
    select 1
    from public.event_organizations eo
    join public.organization_managers om
      on om.organization_id = eo.organization_id
     and om.site_id = eo.site_id
    where eo.event_id = events.id
      and eo.site_id = events.site_id
      and om.user_id = auth.uid()
      and om.active = true
  )
);

create or replace function public.protect_event_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(auth.jwt() ->> 'email')
  ) then
    return new;
  end if;

  new.site_id := old.site_id;
  new.created_by := old.created_by;
  new.status := old.status;
  new.approved := old.approved;
  new.approved_by := old.approved_by;
  new.approved_at := old.approved_at;
  new.featured := old.featured;
  new.featured_order := old.featured_order;
  return new;
end;
$$;

drop trigger if exists protect_event_admin_fields_before_update on public.events;
create trigger protect_event_admin_fields_before_update
before update on public.events
for each row execute function public.protect_event_admin_fields();
