-- Isolated CI database only. Existing press_releases comes from attachment tests.
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable
as $$ select current_setting('request.jwt.claim.role', true) $$;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
end $$;
create table public.admins (user_id uuid primary key, role text);
insert into public.admins values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin');
alter table public.press_releases
  add column id uuid not null default gen_random_uuid(),
  add column site_id uuid not null default '10000000-0000-0000-0000-000000000001',
  add column status text not null default 'pending',
  add column release_date date not null default current_date,
  add column published_at timestamptz,
  add column updated_at timestamptz default now();
insert into public.press_releases(id,status,release_date,published_at) values
('11111111-1111-1111-1111-111111111111','approved','2020-01-01',now()-interval '1 hour'),
('22222222-2222-2222-2222-222222222222','approved','2026-01-01',now()-interval '1 hour'),
('33333333-3333-3333-3333-333333333333','approved','2024-01-01',now()-interval '1 hour'),
('44444444-4444-4444-4444-444444444444','approved','2027-01-01',now()+interval '1 day'),
('55555555-5555-5555-5555-555555555555','pending','2026-01-01',null);
insert into public.press_releases(id,site_id,status,release_date,published_at) values
('66666666-6666-6666-6666-666666666666','20000000-0000-0000-0000-000000000002','approved','2026-01-01',now()-interval '1 hour');
\ir ../supabase/migrations/20261109120000_add_press_release_pinning.sql
\ir ../supabase/migrations/20261109120000_add_press_release_pinning.sql
grant usage on schema public, auth to authenticated;
grant select, insert, update on public.press_releases to authenticated;
-- Deliberately permissive owner access: the pin guard must still reject column tampering.
create policy ci_owner_access on public.press_releases for all to authenticated using (true) with check (true);
do $$ begin
  if exists(select 1 from public.press_releases where is_pinned) then raise exception 'Existing releases unexpectedly pinned'; end if;
  if has_function_privilege('anon','public.set_press_release_pinned(uuid,uuid,boolean)','EXECUTE') then raise exception 'Anonymous pin access granted'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
do $$ begin
  begin
    perform public.set_press_release_pinned('11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',true);
    raise exception 'Owner RPC pin was allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.press_releases set is_pinned=true where id='11111111-1111-1111-1111-111111111111';
    raise exception 'Owner direct pin was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.press_releases(status,is_pinned) values('approved',true);
    raise exception 'Owner inserted a pinned release';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
select public.set_press_release_pinned('11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',true);
select public.set_press_release_pinned('33333333-3333-3333-3333-333333333333','10000000-0000-0000-0000-000000000001',true);
select public.set_press_release_pinned('44444444-4444-4444-4444-444444444444','10000000-0000-0000-0000-000000000001',true);
select public.set_press_release_pinned('66666666-6666-6666-6666-666666666666','20000000-0000-0000-0000-000000000002',true);
do $$ declare ordered uuid[]; begin
  select array_agg(id order by is_pinned desc, release_date desc, published_at desc, id)
  into ordered from public.press_releases where site_id='10000000-0000-0000-0000-000000000001' and status='approved' and published_at<=now();
  if ordered <> array['33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222']::uuid[] then raise exception 'Incorrect pinned order: %', ordered; end if;
  begin
    perform public.set_press_release_pinned('55555555-5555-5555-5555-555555555555','10000000-0000-0000-0000-000000000001',true);
    raise exception 'Draft pin was allowed';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.set_press_release_pinned('11111111-1111-1111-1111-111111111111','20000000-0000-0000-0000-000000000002',false);
    raise exception 'Wrong-site RPC was allowed';
  exception when no_data_found then null; end;
  begin
    perform public.set_press_release_pinned('11111111-1111-1111-1111-111111111111','10000000-0000-0000-0000-000000000001',null);
    raise exception 'Null pin value was allowed';
  exception when invalid_parameter_value then null; end;
end $$;
select public.set_press_release_pinned('33333333-3333-3333-3333-333333333333','10000000-0000-0000-0000-000000000001',false);
do $$ declare ordered uuid[]; begin
  select array_agg(id order by is_pinned desc, release_date desc, published_at desc, id)
  into ordered from public.press_releases where site_id='10000000-0000-0000-0000-000000000001' and status='approved' and published_at<=now();
  if ordered <> array['11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333']::uuid[] then raise exception 'Unpin did not restore order'; end if;
end $$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
do $$ begin
  begin
    update public.press_releases set is_pinned=false where id='11111111-1111-1111-1111-111111111111';
    raise exception 'Owner direct unpin was allowed';
  exception when insufficient_privilege then null; end;
  -- Normal owner edits can still return a pinned release to moderation.
  update public.press_releases set status='pending' where id='11111111-1111-1111-1111-111111111111';
  if exists(select 1 from public.press_releases where id='11111111-1111-1111-1111-111111111111' and status='approved' and published_at<=now()) then raise exception 'Pin bypassed moderation'; end if;
end $$;
reset role;
do $$ begin
  if not (select relrowsecurity from pg_class where oid='public.press_releases'::regclass) then raise exception 'RLS was disabled'; end if;
end $$;
