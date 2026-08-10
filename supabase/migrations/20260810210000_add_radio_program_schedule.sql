create table if not exists public.radio_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text,
  host_id uuid references public.radio_team_members(id) on delete set null,
  host_name text,
  schedule_type text not null default 'one_time' check (schedule_type in ('one_time', 'daily', 'weekly')),
  starts_at timestamptz,
  ends_at timestamptz,
  days_of_week smallint[] not null default '{}',
  start_time time,
  end_time time,
  timezone text not null default 'America/Los_Angeles',
  effective_from date,
  effective_until date,
  is_published boolean not null default true,
  display_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint radio_program_schedule_shape check (
    (schedule_type = 'one_time' and starts_at is not null and ends_at is not null and ends_at > starts_at)
    or
    (schedule_type in ('daily', 'weekly') and start_time is not null and end_time is not null and end_time > start_time)
  ),
  constraint radio_program_weekly_days check (
    schedule_type <> 'weekly' or cardinality(days_of_week) > 0
  ),
  constraint radio_program_effective_range check (
    effective_until is null or effective_from is null or effective_until >= effective_from
  )
);

create index if not exists radio_programs_public_one_time_idx
  on public.radio_programs(is_published, starts_at)
  where schedule_type = 'one_time';
create index if not exists radio_programs_public_recurring_idx
  on public.radio_programs(is_published, display_order, start_time)
  where schedule_type in ('daily', 'weekly');

alter table public.radio_programs enable row level security;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "Public can read published radio programs" on public.radio_programs;
create policy "Public can read published radio programs"
  on public.radio_programs for select
  using (is_published = true or public.is_sdtv_admin());

drop policy if exists "Admins can insert radio programs" on public.radio_programs;
create policy "Admins can insert radio programs"
  on public.radio_programs for insert to authenticated
  with check (public.is_sdtv_admin());

drop policy if exists "Admins can update radio programs" on public.radio_programs;
create policy "Admins can update radio programs"
  on public.radio_programs for update to authenticated
  using (public.is_sdtv_admin()) with check (public.is_sdtv_admin());

drop policy if exists "Admins can delete radio programs" on public.radio_programs;
create policy "Admins can delete radio programs"
  on public.radio_programs for delete to authenticated
  using (public.is_sdtv_admin());

drop trigger if exists radio_programs_set_updated_at on public.radio_programs;
create trigger radio_programs_set_updated_at
before update on public.radio_programs
for each row execute function public.set_updated_at();

comment on table public.radio_programs is 'Published one-time and recurring Seattle Desi Radio programming.';
comment on column public.radio_programs.days_of_week is 'ISO weekdays: Monday=1 through Sunday=7.';
comment on column public.radio_programs.timezone is 'IANA timezone used for recurring local times.';
