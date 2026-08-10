alter table public.radio_programs
  add column if not exists status text not null default 'draft';

alter table public.radio_programs
  drop constraint if exists radio_programs_status_check;
alter table public.radio_programs
  add constraint radio_programs_status_check
  check (status in ('draft', 'published', 'on_hold', 'archived'));

update public.radio_programs
set status = case when is_published then 'published' else 'draft' end
where status = 'draft';

alter table public.radio_programs
  drop constraint if exists radio_program_schedule_shape;
alter table public.radio_programs
  add constraint radio_program_schedule_shape check (
    (schedule_type = 'one_time' and starts_at is not null and ends_at is not null and ends_at > starts_at)
    or
    (schedule_type in ('daily', 'weekly') and start_time is not null and end_time is not null and end_time <> start_time)
  );

create or replace function public.sync_radio_program_publication()
returns trigger language plpgsql set search_path = public as $$
begin
  new.is_published = (new.status = 'published');
  return new;
end;
$$;

drop trigger if exists radio_programs_sync_publication on public.radio_programs;
create trigger radio_programs_sync_publication
before insert or update of status on public.radio_programs
for each row execute function public.sync_radio_program_publication();

drop policy if exists "Public can read published radio programs" on public.radio_programs;
create policy "Public can read published radio programs"
  on public.radio_programs for select
  using (status = 'published' or public.is_sdtv_admin());

create index if not exists radio_programs_public_status_idx
  on public.radio_programs(status, schedule_type, display_order, start_time);

with seed(title, description, host_name, days_of_week, start_time, end_time, display_order) as (
  values
    ('Suprabhat Seattle', 'Devotional songs', null, array[1,2,3,4,5]::smallint[], '06:00'::time, '07:00'::time, 10),
    ('Morning Express', 'Multilingual songs', null, array[1,2,3,4,5]::smallint[], '07:00'::time, '09:00'::time, 20),
    ('SDR Encore', 'Repeat broadcast', null, array[1,2,3,4,5]::smallint[], '09:00'::time, '10:00'::time, 30),
    ('Golden Melodies', 'Evergreen songs', null, array[1,2,3,4,5]::smallint[], '10:00'::time, '12:00'::time, 40),
    ('Community Bulletin', 'Community announcements', null, array[1,2,3,4,5]::smallint[], '12:00'::time, '12:10'::time, 50),
    ('Lunch Beats', 'Music', null, array[1,2,3,4,5]::smallint[], '12:10'::time, '14:00'::time, 60),
    ('Seattle Spotlight', 'Local programs', null, array[1,2,3,4,5]::smallint[], '14:00'::time, '15:00'::time, 70),
    ('Drive Time Mix', 'Music', null, array[1,2,3,4,5]::smallint[], '15:00'::time, '17:00'::time, 80),
    ('Encore Hour', 'Repeat show', null, array[1,2,3,4,5]::smallint[], '17:00'::time, '18:00'::time, 90),
    ('Evening Melodies', 'Music', null, array[1,2,3,4,5]::smallint[], '18:00'::time, '20:00'::time, 100),
    ('Prime Time Local', 'Local programs', null, array[1,2,3,4,5]::smallint[], '20:00'::time, '21:00'::time, 110),
    ('Prime Replay', 'Repeat show', null, array[1,2,3,4,5]::smallint[], '21:00'::time, '22:00'::time, 120),
    ('Night Lounge', 'Overnight music', null, array[1,2,3,4,5]::smallint[], '22:00'::time, '06:00'::time, 130),

    ('Devotional Hour', 'Devotional programming', null, array[6]::smallint[], '06:00'::time, '07:00'::time, 210),
    ('Weekend Morning Mix', 'Weekend music mix', null, array[6]::smallint[], '07:00'::time, '09:00'::time, 220),
    ('The Saturday Pause', 'Live Saturday feature', null, array[6]::smallint[], '09:00'::time, '09:10'::time, 230),
    ('Best of By2Coffee', 'Featured By2Coffee programming', null, array[6]::smallint[], '09:10'::time, '12:00'::time, 240),
    ('Regional Music Marathon', 'Regional music', null, array[6]::smallint[], '12:00'::time, '14:00'::time, 250),
    ('Community Special', 'Community feature program', null, array[6]::smallint[], '14:00'::time, '15:00'::time, 260),
    ('Weekend Hits', 'Weekend music hits', null, array[6]::smallint[], '15:00'::time, '17:00'::time, 270),
    ('Best of Seattle Spotlight', 'Seattle Spotlight encore', null, array[6]::smallint[], '17:00'::time, '18:00'::time, 280),
    ('Listener Requests', 'Music selected from listener requests', null, array[6]::smallint[], '18:00'::time, '20:00'::time, 290),
    ('Special Live Program', 'Live weekend programming', null, array[6]::smallint[], '20:00'::time, '21:00'::time, 300),
    ('Repeat Feature', 'Repeat feature program', null, array[6]::smallint[], '21:00'::time, '22:00'::time, 310),
    ('Night Lounge', 'Overnight music', null, array[6]::smallint[], '22:00'::time, '06:00'::time, 320),

    ('Devotional Hour', 'Devotional programming', null, array[7]::smallint[], '06:00'::time, '07:00'::time, 410),
    ('Bhajans & Spiritual Music', 'Bhajans and spiritual music', null, array[7]::smallint[], '07:00'::time, '08:00'::time, 420),
    ('Weekend Music Mix', 'Weekend music mix', null, array[7]::smallint[], '08:00'::time, '09:00'::time, 430),
    ('By2Coffee', 'Live By2Coffee program', 'RJ Loki', array[7]::smallint[], '09:30'::time, '10:00'::time, 440),
    ('Inspirational Music', 'Inspirational music', null, array[7]::smallint[], '10:00'::time, '12:00'::time, 450),
    ('Best of SDR Interviews', 'Selected Seattle Desi Radio interviews', null, array[7]::smallint[], '12:00'::time, '14:00'::time, 460),
    ('Local Community Program', 'Local community programming', null, array[7]::smallint[], '14:00'::time, '15:00'::time, 470),
    ('Listener Choice Hits', 'Listener-selected music hits', null, array[7]::smallint[], '15:00'::time, '17:00'::time, 480),
    ('Repeat Feature', 'Repeat feature program', null, array[7]::smallint[], '17:00'::time, '18:00'::time, 490),
    ('Family Music Hour', 'Music for the whole family', null, array[7]::smallint[], '18:00'::time, '20:00'::time, 500),
    ('Weekend Special', 'Weekend special programming', null, array[7]::smallint[], '20:00'::time, '21:00'::time, 510),
    ('Weekend Replay', 'Weekend repeat broadcast', null, array[7]::smallint[], '21:00'::time, '22:00'::time, 520),
    ('Night Lounge', 'Overnight music', null, array[7]::smallint[], '22:00'::time, '06:00'::time, 530)
)
insert into public.radio_programs (
  title, description, host_name, schedule_type, days_of_week,
  start_time, end_time, timezone, status, is_published, display_order
)
select title, description, host_name, 'weekly', days_of_week,
  start_time, end_time, 'America/Los_Angeles', 'published', true, display_order
from seed
where not exists (
  select 1 from public.radio_programs existing
  where existing.schedule_type = 'weekly'
    and existing.title = seed.title
    and existing.days_of_week = seed.days_of_week
    and existing.start_time = seed.start_time
);

comment on column public.radio_programs.status is 'Editorial workflow: draft, published, on_hold, or archived.';
