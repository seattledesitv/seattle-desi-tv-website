-- Studio administrators can create unclaimed influencer directory records.
alter table public.influencer_profiles enable row level security;

drop policy if exists "Admins create influencer profiles" on public.influencer_profiles;
create policy "Admins create influencer profiles"
on public.influencer_profiles for insert to authenticated
with check (public.is_sdtv_admin());

drop policy if exists "Admins update influencer profiles" on public.influencer_profiles;
create policy "Admins update influencer profiles"
on public.influencer_profiles for update to authenticated
using (public.is_sdtv_admin())
with check (public.is_sdtv_admin());

comment on table public.influencer_profiles is
  'Influencer submissions and Studio-created claimable directory profiles.';
