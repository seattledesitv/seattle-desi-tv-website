-- Allow assigned crew members to confirm and submit their own approved assignments.
-- Run this in Supabase SQL Editor if Confirm / Submit to Editor does not persist.

alter table public.event_crew_assignments enable row level security;

drop policy if exists "Crew can update own approved assignments" on public.event_crew_assignments;
create policy "Crew can update own approved assignments"
  on public.event_crew_assignments
  for update
  to authenticated
  using (
    status = 'approved'
    and (
      user_id = auth.uid()
      or lower(coalesce(user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    status = 'approved'
    and (
      user_id = auth.uid()
      or lower(coalesce(user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Optional quick verification after testing from the website:
-- select id, user_id, user_email, status, crew_confirmed, coverage_completed, coverage_notes, completed_at
-- from public.event_crew_assignments
-- order by created_at desc
-- limit 10;
