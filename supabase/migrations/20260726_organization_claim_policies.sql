alter table public.organization_claim_requests enable row level security;
alter table public.organization_managers enable row level security;

create unique index if not exists organization_claim_requests_one_open_per_user
on public.organization_claim_requests(organization_id, requester_user_id)
where status in ('pending','needs_information');

drop policy if exists "organization claims insert own" on public.organization_claim_requests;
create policy "organization claims insert own" on public.organization_claim_requests
for insert to authenticated with check (requester_user_id = auth.uid());

drop policy if exists "organization claims read own" on public.organization_claim_requests;
create policy "organization claims read own" on public.organization_claim_requests
for select to authenticated using (requester_user_id = auth.uid());

drop policy if exists "organization claims update own" on public.organization_claim_requests;
create policy "organization claims update own" on public.organization_claim_requests
for update to authenticated
using (requester_user_id = auth.uid() and status in ('pending','needs_information'))
with check (requester_user_id = auth.uid() and status = 'pending');

drop policy if exists "organization claims admin access" on public.organization_claim_requests;
create policy "organization claims admin access" on public.organization_claim_requests
for all to authenticated
using (exists(select 1 from public.admins a where a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt()->>'email')))
with check (exists(select 1 from public.admins a where a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt()->>'email')));

drop policy if exists "organization managers read own" on public.organization_managers;
create policy "organization managers read own" on public.organization_managers
for select to authenticated
using (user_id = auth.uid() or exists(select 1 from public.admins a where a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt()->>'email')));

drop policy if exists "organization managers admin access" on public.organization_managers;
create policy "organization managers admin access" on public.organization_managers
for all to authenticated
using (exists(select 1 from public.admins a where a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt()->>'email')))
with check (exists(select 1 from public.admins a where a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt()->>'email')));