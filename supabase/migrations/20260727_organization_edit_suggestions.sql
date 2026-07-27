create table if not exists public.organization_edit_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.community_organizations(id) on delete cascade,
  submitter_user_id uuid references auth.users(id) on delete set null,
  submitter_name text,
  submitter_email text,
  correction_type text not null default 'general' check (correction_type in ('general','website','email','phone','description','contact','image','social','other')),
  suggestion text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_edit_suggestions_org_idx on public.organization_edit_suggestions(organization_id, created_at desc);

alter table public.organization_edit_suggestions enable row level security;

drop policy if exists "anyone submits organization edit suggestions" on public.organization_edit_suggestions;
create policy "anyone submits organization edit suggestions"
on public.organization_edit_suggestions for insert to anon, authenticated
with check (submitter_user_id is null or submitter_user_id = auth.uid());

drop policy if exists "users read own organization suggestions" on public.organization_edit_suggestions;
create policy "users read own organization suggestions"
on public.organization_edit_suggestions for select to authenticated
using (submitter_user_id = auth.uid());

drop policy if exists "admins manage organization suggestions" on public.organization_edit_suggestions;
create policy "admins manage organization suggestions"
on public.organization_edit_suggestions for all to authenticated
using (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%'))
with check (exists(select 1 from public.admins a where (a.user_id=auth.uid() or lower(a.email)=lower(auth.jwt()->>'email')) and lower(a.role) like '%admin%'));
