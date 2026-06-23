-- Recognition profile photo public read policy
-- Run in Supabase SQL Editor if homepage recognition shows initials even when photo_url exists.
-- This allows the public homepage to read only the onboarding table rows through normal SELECT.
-- The table contains more than photo fields, so do not expose sensitive data in UI.

alter table public.volunteer_onboarding_submissions enable row level security;

drop policy if exists "Public can read recognition profile photos" on public.volunteer_onboarding_submissions;
create policy "Public can read recognition profile photos"
on public.volunteer_onboarding_submissions
for select
to anon, authenticated
using (photo_url is not null or full_name is not null or email is not null);

-- Verify after running:
-- select email, full_name, photo_url
-- from public.volunteer_onboarding_submissions
-- where email = 'abharathkumar@gmail.com';
