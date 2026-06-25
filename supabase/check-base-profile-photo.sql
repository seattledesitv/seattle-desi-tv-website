-- Diagnostic checks for Studio User Control vs My Profile base photo sync.
-- Run this in Supabase SQL Editor.
-- Goal: Base Profile Photo must come only from public.user_profiles.profile_photo_url.
-- Connected images live separately in team_members.image, radio_team_members.image,
-- volunteer_onboarding_submissions.photo_url, and influencer_profiles.photo_url.

-- 1) Check one user end-to-end.
-- Replace the email below.
with target as (
  select lower('abharathkumar@gmail.com') as email
)
select
  'base user_profiles' as source,
  up.user_id::text as user_id,
  up.email,
  up.profile_photo_url as image_url,
  up.id_badge_url,
  up.updated_at
from public.user_profiles up
join target t on lower(up.email) = t.email
union all
select
  'team_members image' as source,
  tm.user_id::text,
  tm.email,
  tm.image as image_url,
  null as id_badge_url,
  tm.updated_at
from public.team_members tm
join target t on lower(tm.email) = t.email
union all
select
  'radio_team_members image' as source,
  rm.user_id::text,
  rm.email,
  rm.image as image_url,
  null as id_badge_url,
  rm.updated_at
from public.radio_team_members rm
join target t on lower(rm.email) = t.email
union all
select
  'volunteer_onboarding photo' as source,
  vo.user_id::text,
  vo.email,
  vo.photo_url as image_url,
  null as id_badge_url,
  vo.updated_at
from public.volunteer_onboarding_submissions vo
join target t on lower(vo.email) = t.email
union all
select
  'influencer_profiles photo' as source,
  ip.user_id::text,
  ip.email,
  ip.photo_url as image_url,
  null as id_badge_url,
  ip.updated_at
from public.influencer_profiles ip
join target t on lower(ip.email) = t.email;

-- 2) Find base profile photos that look like old team/id-card assets.
-- These are likely values accidentally saved into user_profiles.profile_photo_url
-- before Studio stopped falling back to connected/team images.
select
  user_id,
  email,
  profile_photo_url,
  updated_at
from public.user_profiles
where profile_photo_url ilike '%/team-images/%'
   or profile_photo_url ilike '%/team/%'
   or profile_photo_url ilike '%Team-ID%'
   or profile_photo_url ilike '%Team-IDs%'
order by updated_at desc nulls last;

-- 3) Optional cleanup for one user only.
-- This clears the base profile photo so My Profile and Studio both show no base photo
-- until the user/admin uploads the true base profile photo.
-- Replace the email and uncomment when ready.
-- update public.user_profiles
-- set profile_photo_url = null,
--     updated_at = now()
-- where lower(email) = lower('abharathkumar@gmail.com')
--   and (
--     profile_photo_url ilike '%/team-images/%'
--     or profile_photo_url ilike '%/team/%'
--     or profile_photo_url ilike '%Team-ID%'
--     or profile_photo_url ilike '%Team-IDs%'
--   );

-- 4) Optional cleanup for all suspicious rows.
-- Only run this after reviewing query #2.
-- update public.user_profiles
-- set profile_photo_url = null,
--     updated_at = now()
-- where profile_photo_url ilike '%/team-images/%'
--    or profile_photo_url ilike '%/team/%'
--    or profile_photo_url ilike '%Team-ID%'
--    or profile_photo_url ilike '%Team-IDs%';
