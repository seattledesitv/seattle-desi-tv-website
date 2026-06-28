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
