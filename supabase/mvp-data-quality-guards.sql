-- SDTV MVP data quality guards
-- Run this in Supabase SQL Editor after checking the duplicate report queries below.
-- If any duplicate report returns rows, clean/merge those rows first, then run the unique indexes.

-- 1) Duplicate report: active event submissions by same creator/title/date
select lower(trim(title)) as title_key, date, created_by, count(*)
from public.events
where status in ('pending','approved')
  and title is not null
  and date is not null
  and created_by is not null
group by lower(trim(title)), date, created_by
having count(*) > 1;

-- 2) Duplicate report: active business submissions by same name/address
select lower(trim(name)) as name_key, lower(trim(address)) as address_key, count(*)
from public.local_businesses
where status in ('pending','approved')
  and name is not null
  and address is not null
group by lower(trim(name)), lower(trim(address))
having count(*) > 1;

-- 3) Duplicate report: active role requests by same user/role
select user_id, requested_role, count(*)
from public.user_role_requests
where status in ('pending','awaiting_orientation','awaiting_onboarding','awaiting_team_role_access','approved')
  and user_id is not null
  and requested_role is not null
group by user_id, requested_role
having count(*) > 1;

-- 4) Duplicate report: onboarding submissions by same user
select user_id, count(*)
from public.volunteer_onboarding_submissions
where user_id is not null
group by user_id
having count(*) > 1;

-- 5) Duplicate report: crew/coverage requests by same user/event/type
select event_id, user_id, assignment_type, count(*)
from public.event_crew_assignments
where event_id is not null
  and user_id is not null
  and assignment_type is not null
group by event_id, user_id, assignment_type
having count(*) > 1;

-- Unique guards. Run these after duplicate report queries return no rows.

create unique index if not exists events_active_creator_title_date_unique
on public.events (created_by, lower(trim(title)), date)
where status in ('pending','approved')
  and created_by is not null
  and title is not null
  and date is not null;

create unique index if not exists local_businesses_active_name_address_unique
on public.local_businesses (lower(trim(name)), lower(trim(address)))
where status in ('pending','approved')
  and name is not null
  and address is not null;

create unique index if not exists user_role_requests_active_user_role_unique
on public.user_role_requests (user_id, requested_role)
where status in ('pending','awaiting_orientation','awaiting_onboarding','awaiting_team_role_access','approved')
  and user_id is not null
  and requested_role is not null;

create unique index if not exists volunteer_onboarding_one_per_user_unique
on public.volunteer_onboarding_submissions (user_id)
where user_id is not null;

create unique index if not exists volunteer_onboarding_one_per_request_unique
on public.volunteer_onboarding_submissions (volunteer_request_id)
where volunteer_request_id is not null;

create unique index if not exists event_crew_assignment_unique_request
on public.event_crew_assignments (event_id, user_id, assignment_type)
where event_id is not null
  and user_id is not null
  and assignment_type is not null;

create unique index if not exists team_members_user_id_unique
on public.team_members(user_id)
where user_id is not null;

create unique index if not exists radio_team_members_user_id_unique
on public.radio_team_members(user_id)
where user_id is not null;
