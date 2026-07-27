alter table if exists public.organization_edit_suggestions enable row level security;

drop policy if exists "organization suggestion submitters can read own" on public.organization_edit_suggestions;
create policy "organization suggestion submitters can read own"
on public.organization_edit_suggestions
for select
to authenticated
using (submitter_user_id = auth.uid());
