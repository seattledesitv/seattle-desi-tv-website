alter table public.team_quick_forms
  add column if not exists active_from timestamptz,
  add column if not exists active_until timestamptz,
  add column if not exists max_responses integer;

alter table public.team_quick_forms
  drop constraint if exists team_quick_forms_max_responses_check;

alter table public.team_quick_forms
  add constraint team_quick_forms_max_responses_check
  check (max_responses is null or max_responses > 0);

create index if not exists team_quick_forms_active_window_idx
  on public.team_quick_forms(site_id, status, active_from, active_until);