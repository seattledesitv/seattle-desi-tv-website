-- Keep one user account while allowing separate team participation in each market.

alter table public.team_members add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.volunteer_onboarding_submissions add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.crew_availability add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.team_member_welcomes add column if not exists site_id uuid references public.sites(id) on delete restrict;
alter table public.user_role_requests add column if not exists site_id uuid references public.sites(id) on delete restrict;

update public.team_members set site_id = public.current_site_id('sea') where site_id is null;
update public.volunteer_onboarding_submissions set site_id = public.current_site_id('sea') where site_id is null;
update public.crew_availability set site_id = public.current_site_id('sea') where site_id is null;
update public.team_member_welcomes set site_id = public.current_site_id('sea') where site_id is null;
update public.user_role_requests set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.team_members where site_id is null)
     or exists (select 1 from public.volunteer_onboarding_submissions where site_id is null)
     or exists (select 1 from public.crew_availability where site_id is null)
     or exists (select 1 from public.team_member_welcomes where site_id is null)
     or exists (select 1 from public.user_role_requests where site_id is null) then
    raise exception 'People operations records could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.team_members alter column site_id set not null;
alter table public.team_members alter column site_id set default public.current_site_id('sea');
alter table public.volunteer_onboarding_submissions alter column site_id set not null;
alter table public.volunteer_onboarding_submissions alter column site_id set default public.current_site_id('sea');
alter table public.crew_availability alter column site_id set not null;
alter table public.crew_availability alter column site_id set default public.current_site_id('sea');
alter table public.team_member_welcomes alter column site_id set not null;
alter table public.team_member_welcomes alter column site_id set default public.current_site_id('sea');
alter table public.user_role_requests alter column site_id set not null;
alter table public.user_role_requests alter column site_id set default public.current_site_id('sea');

drop index if exists public.user_role_requests_user_role_active_unique;
drop index if exists public.user_role_requests_email_role_active_unique;
drop index if exists public.user_role_requests_active_user_role_unique;
create unique index user_role_requests_site_user_role_active_unique
  on public.user_role_requests (site_id, user_id, requested_role)
  where user_id is not null and status in ('pending', 'awaiting_orientation', 'awaiting_onboarding', 'awaiting_team_role_access', 'approved');
create unique index user_role_requests_site_email_role_active_unique
  on public.user_role_requests (site_id, lower(email), requested_role)
  where email is not null and status in ('pending', 'awaiting_orientation', 'awaiting_onboarding', 'awaiting_team_role_access', 'approved');

drop index if exists public.team_members_user_id_unique;
create unique index team_members_site_user_id_unique on public.team_members (site_id, user_id) where user_id is not null;

drop index if exists public.volunteer_onboarding_user_active_unique;
drop index if exists public.volunteer_onboarding_one_per_user_unique;
create unique index volunteer_onboarding_site_user_active_unique
  on public.volunteer_onboarding_submissions (site_id, user_id)
  where user_id is not null and status in ('submitted', 'pending', 'awaiting_team_role_access');

alter table public.crew_availability drop constraint if exists crew_availability_user_id_available_date_key;
drop index if exists public.crew_availability_user_id_available_date_key;
alter table public.crew_availability
  add constraint crew_availability_site_user_date_key unique (site_id, user_id, available_date);

alter table public.team_member_welcomes drop constraint if exists team_member_welcomes_email_key;
drop index if exists public.team_member_welcomes_email_key;
alter table public.team_member_welcomes
  add constraint team_member_welcomes_site_email_key unique (site_id, email);

create index if not exists team_members_site_public_idx on public.team_members (site_id, show_on_public_team, created_at);
create index if not exists volunteer_onboarding_site_status_idx on public.volunteer_onboarding_submissions (site_id, status, created_at desc);
create index if not exists crew_availability_site_date_idx on public.crew_availability (site_id, available_date, status);
create index if not exists team_member_welcomes_site_completed_idx on public.team_member_welcomes (site_id, completed_at, created_at desc);
create index if not exists user_role_requests_site_status_idx on public.user_role_requests (site_id, status, created_at desc);

comment on column public.team_members.site_id is 'Market whose team roster includes this person.';
comment on column public.volunteer_onboarding_submissions.site_id is 'Market receiving this volunteer onboarding submission.';
