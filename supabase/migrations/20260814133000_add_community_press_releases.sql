create table if not exists public.press_releases (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null,
  body text not null,
  organization_name text,
  location text,
  release_date date not null default current_date,
  image_urls text[] not null default '{}',
  contact_name text,
  contact_email text,
  source_url text,
  status text not null default 'pending' check (status in ('pending','changes_requested','approved','rejected','archived')),
  admin_notes text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint press_release_title_length check (char_length(trim(title)) between 5 and 200),
  constraint press_release_summary_length check (char_length(trim(summary)) between 20 and 600),
  constraint press_release_body_length check (char_length(trim(body)) >= 100),
  constraint press_release_image_limit check (cardinality(image_urls) <= 12)
);

create index if not exists press_releases_public_idx
  on public.press_releases(status, release_date desc, published_at desc);
create index if not exists press_releases_owner_idx
  on public.press_releases(created_by, created_at desc);

alter table public.press_releases enable row level security;

create policy "Public reads approved press releases"
  on public.press_releases for select to anon, authenticated
  using (status = 'approved' and published_at is not null and published_at <= now());

create policy "Owners read press releases"
  on public.press_releases for select to authenticated
  using (created_by = auth.uid());

create policy "Users submit press releases"
  on public.press_releases for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending');

create policy "Owners update unpublished press releases"
  on public.press_releases for update to authenticated
  using (created_by = auth.uid() and status in ('pending','changes_requested'))
  with check (created_by = auth.uid() and status = 'pending');

create policy "Admins manage press releases"
  on public.press_releases for all to authenticated
  using (exists(select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%'))
  with check (exists(select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%'));

create or replace function public.review_press_release(
  press_release_id uuid,
  decision text,
  review_notes text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists(select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%') then
    raise exception 'Admin access required';
  end if;

  if decision = 'approve' then
    update public.press_releases
      set status = 'approved', admin_notes = nullif(trim(review_notes), ''),
          approved_by = auth.uid(), approved_at = now(),
          published_at = coalesce(published_at, now()), updated_at = now()
      where id = press_release_id;
  elsif decision = 'changes' then
    update public.press_releases
      set status = 'changes_requested', admin_notes = nullif(trim(review_notes), ''),
          approved_by = null, approved_at = null, published_at = null, updated_at = now()
      where id = press_release_id;
  elsif decision = 'reject' then
    update public.press_releases
      set status = 'rejected', admin_notes = nullif(trim(review_notes), ''),
          approved_by = null, approved_at = null, published_at = null, updated_at = now()
      where id = press_release_id;
  elsif decision = 'archive' then
    update public.press_releases
      set status = 'archived', admin_notes = nullif(trim(review_notes), ''), updated_at = now()
      where id = press_release_id;
  else
    raise exception 'Invalid review decision';
  end if;

  if not found then raise exception 'Press release not found'; end if;
end;
$$;

revoke all on function public.review_press_release(uuid,text,text) from public;
grant execute on function public.review_press_release(uuid,text,text) to authenticated;

comment on table public.press_releases is 'Moderated community and Studio press releases with multi-image galleries.';
