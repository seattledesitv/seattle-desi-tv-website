-- Newsletter unsubscribe should be a soft status change, never a row delete.

alter table newsletter_subscribers
  add column if not exists unsubscribed_at timestamptz;

alter table newsletter_subscribers
  add column if not exists status text not null default 'active';

update newsletter_subscribers
set status = 'active'
where status is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'newsletter_subscribers_status_check'
  ) then
    alter table newsletter_subscribers
      add constraint newsletter_subscribers_status_check
      check (status in ('active','pending','unsubscribed'));
  end if;
end $$;

alter table newsletter_subscribers enable row level security;

drop policy if exists newsletter_subscribers_public_select on newsletter_subscribers;
drop policy if exists newsletter_subscribers_public_insert on newsletter_subscribers;
drop policy if exists newsletter_subscribers_public_update on newsletter_subscribers;

create policy newsletter_subscribers_public_select
on newsletter_subscribers
for select
to anon, authenticated
using (true);

create policy newsletter_subscribers_public_insert
on newsletter_subscribers
for insert
to anon, authenticated
with check (true);

create policy newsletter_subscribers_public_update
on newsletter_subscribers
for update
to anon, authenticated
using (true)
with check (true);
