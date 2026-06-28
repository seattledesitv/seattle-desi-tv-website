-- Admin policies for newsletter campaign drafts/history.
-- Run this after creating newsletter_campaigns.

alter table newsletter_campaigns enable row level security;

drop policy if exists newsletter_campaigns_admin_select on newsletter_campaigns;
drop policy if exists newsletter_campaigns_admin_insert on newsletter_campaigns;
drop policy if exists newsletter_campaigns_admin_update on newsletter_campaigns;
drop policy if exists newsletter_campaigns_admin_delete on newsletter_campaigns;

create policy newsletter_campaigns_admin_select
on newsletter_campaigns
for select
to authenticated
using (
  exists (
    select 1 from admins
    where admins.user_id = auth.uid()
  )
);

create policy newsletter_campaigns_admin_insert
on newsletter_campaigns
for insert
to authenticated
with check (
  exists (
    select 1 from admins
    where admins.user_id = auth.uid()
  )
);

create policy newsletter_campaigns_admin_update
on newsletter_campaigns
for update
to authenticated
using (
  exists (
    select 1 from admins
    where admins.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from admins
    where admins.user_id = auth.uid()
  )
);

create policy newsletter_campaigns_admin_delete
on newsletter_campaigns
for delete
to authenticated
using (
  exists (
    select 1 from admins
    where admins.user_id = auth.uid()
  )
);
