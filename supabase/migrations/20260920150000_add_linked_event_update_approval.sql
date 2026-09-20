-- Organization managers propose linked-event edits; SDTV admins approve before publication.

alter table public.listing_management_requests
  add column if not exists proposed_changes jsonb,
  add column if not exists current_snapshot jsonb;

-- Linked organization managers now use the moderated request workflow instead
-- of updating the public event row directly.
drop policy if exists "organization managers update linked events" on public.events;

create or replace function public.review_listing_management_request(
  request_id uuid,
  next_status text,
  review_notes text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.listing_management_requests%rowtype;
  changes jsonb;
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid() and lower(a.role) like '%admin%') then
    raise exception 'Studio admin access required';
  end if;
  if next_status not in ('pending', 'needs_information', 'approved', 'rejected') then
    raise exception 'Invalid review status';
  end if;

  select * into request_row from public.listing_management_requests where id = request_id for update;
  if not found then raise exception 'Listing request not found'; end if;

  if next_status = 'approved' and request_row.request_type = 'claim' then
    insert into public.listing_managers(entity_type, entity_id, user_id, role, verified_by, verified_at, active)
    values (request_row.entity_type, request_row.entity_id, request_row.requester_user_id, 'owner', auth.uid(), now(), true)
    on conflict (entity_type, entity_id, user_id) do update
      set role = 'owner', verified_by = auth.uid(), verified_at = now(), active = true;

    if request_row.entity_type = 'event' then
      update public.events set created_by = request_row.requester_user_id where id = request_row.entity_id;
    elsif request_row.entity_type = 'influencer' then
      update public.influencer_profiles set user_id = request_row.requester_user_id where id = request_row.entity_id;
    else
      update public.community_groups set submitted_by = request_row.requester_user_id where id = request_row.entity_id;
    end if;
  elsif next_status = 'approved'
    and request_row.request_type = 'correction'
    and request_row.entity_type = 'event' then
    changes := request_row.proposed_changes;
    if changes is null then
      raise exception 'This event update request has no proposed changes';
    end if;

    update public.events
    set
      title = case when changes ? 'title' then changes ->> 'title' else title end,
      date = case when changes ? 'date' then (changes ->> 'date')::date else date end,
      end_date = case when changes ? 'end_date' then nullif(changes ->> 'end_date', '')::date else end_date end,
      local_start_time = case when changes ? 'local_start_time' then nullif(changes ->> 'local_start_time', '')::time else local_start_time end,
      local_end_time = case when changes ? 'local_end_time' then nullif(changes ->> 'local_end_time', '')::time else local_end_time end,
      event_timezone = case when changes ? 'event_timezone' then changes ->> 'event_timezone' else event_timezone end,
      location = case when changes ? 'location' then changes ->> 'location' else location end,
      description = case when changes ? 'description' then nullif(changes ->> 'description', '') else description end,
      ticket_url = case when changes ? 'ticket_url' then nullif(changes ->> 'ticket_url', '') else ticket_url end,
      poc_email = case when changes ? 'poc_email' then nullif(changes ->> 'poc_email', '') else poc_email end,
      poc_phone = case when changes ? 'poc_phone' then nullif(changes ->> 'poc_phone', '') else poc_phone end,
      image = case when changes ? 'image' then nullif(changes ->> 'image', '') else image end,
      image_urls = case
        when changes ? 'image_urls' and jsonb_typeof(changes -> 'image_urls') = 'array'
          then array(select jsonb_array_elements_text(changes -> 'image_urls'))
        when changes ? 'image_urls' then null
        else image_urls
      end,
      updated_at = now()
    where id = request_row.entity_id
      and site_id = request_row.site_id;

    if not found then raise exception 'The event could not be found for this site'; end if;
  elsif next_status = 'approved' and request_row.request_type = 'removal' then
    if request_row.entity_type = 'event' then
      update public.events set status = 'rejected', approved = false where id = request_row.entity_id;
    elsif request_row.entity_type = 'influencer' then
      update public.influencer_profiles set status = 'hidden', public_listing = false where id = request_row.entity_id;
    else
      update public.community_groups set status = 'rejected', approved = false where id = request_row.entity_id;
    end if;
  end if;

  update public.listing_management_requests
  set status = next_status, admin_notes = nullif(trim(review_notes), ''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = request_id;
end;
$$;

revoke all on function public.review_listing_management_request(uuid, text, text) from public;
grant execute on function public.review_listing_management_request(uuid, text, text) to authenticated;
