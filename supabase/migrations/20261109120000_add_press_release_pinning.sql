-- Admin-controlled pinning; keep all existing publishing and RLS behavior.
begin;

alter table public.press_releases
  add column if not exists is_pinned boolean not null default false;

create index if not exists press_releases_site_pinned_public_idx
  on public.press_releases (site_id, is_pinned desc, release_date desc, published_at desc, id)
  where status = 'approved';

create or replace function public.guard_press_release_pinning()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT' and new.is_pinned)
     or (tg_op = 'UPDATE' and new.is_pinned is distinct from old.is_pinned) then
    if coalesce(auth.role(), '') <> 'service_role'
       and not exists (
         select 1 from public.admins a
         where a.user_id = auth.uid() and lower(a.role) like '%admin%'
       ) then
      raise exception 'Admin access is required to pin press releases.' using errcode = '42501';
    end if;
    if new.is_pinned and new.status <> 'approved' then
      raise exception 'Only approved press releases can be pinned.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_press_release_pinning() from public;
drop trigger if exists guard_press_release_pinning on public.press_releases;
create trigger guard_press_release_pinning
  before insert or update on public.press_releases
  for each row execute function public.guard_press_release_pinning();

create or replace function public.set_press_release_pinned(
  press_release_id uuid, target_site_id uuid, pin_value boolean
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not exists (
       select 1 from public.admins a
       where a.user_id = auth.uid() and lower(a.role) like '%admin%'
     ) then
    raise exception 'Admin access is required to pin press releases.' using errcode = '42501';
  end if;
  if pin_value is null then
    raise exception 'A pin value is required.' using errcode = '22023';
  end if;
  update public.press_releases p
    set is_pinned = pin_value, updated_at = now()
    where p.id = press_release_id and p.site_id = target_site_id;
  if not found then
    raise exception 'Press release not found for this site.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_press_release_pinned(uuid, uuid, boolean) from public;
grant execute on function public.set_press_release_pinned(uuid, uuid, boolean) to authenticated, service_role;
comment on column public.press_releases.is_pinned is 'Administrator-selected public list priority. Multiple pinned releases retain release-date order.';
commit;
