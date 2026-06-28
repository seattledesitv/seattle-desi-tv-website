-- Allows the public footer subscribe API to add/update subscriber emails without Resend.
-- This stores the email only; sending email is handled separately from Studio.

alter table newsletter_subscribers enable row level security;

drop policy if exists newsletter_subscribers_public_insert on newsletter_subscribers;
drop policy if exists newsletter_subscribers_public_update on newsletter_subscribers;

create policy newsletter_subscribers_public_insert
on newsletter_subscribers
for insert
to anon, authenticated
with check (
  email is not null
  and position('@' in email) > 1
);

create policy newsletter_subscribers_public_update
on newsletter_subscribers
for update
to anon, authenticated
using (
  email is not null
  and position('@' in email) > 1
)
with check (
  email is not null
  and position('@' in email) > 1
);
