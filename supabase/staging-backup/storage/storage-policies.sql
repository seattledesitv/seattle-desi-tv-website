-- Storage policies captured from production.

drop policy if exists "Admins can upload radio team images" on storage.objects;
create policy "Admins can upload radio team images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'radio-team-images'
  and exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
      and lower(a.role) like '%admin%'
  )
);

drop policy if exists "Admins can upload team images" on storage.objects;
create policy "Admins can upload team images"
on storage.objects for insert to authenticated
with check (bucket_id = 'team-images');

drop policy if exists "Anyone can view business images" on storage.objects;
create policy "Anyone can view business images"
on storage.objects for select to public
using (bucket_id = 'business-images');

drop policy if exists "Anyone can view event images" on storage.objects;
create policy "Anyone can view event images"
on storage.objects for select to public
using (bucket_id = 'event-images');

drop policy if exists "Anyone can view event posters" on storage.objects;
create policy "Anyone can view event posters"
on storage.objects for select to public
using (bucket_id = 'event-posters');

drop policy if exists "Anyone can view radio team images" on storage.objects;
create policy "Anyone can view radio team images"
on storage.objects for select to public
using (bucket_id = 'radio-team-images');

drop policy if exists "Anyone can view team images" on storage.objects;
create policy "Anyone can view team images"
on storage.objects for select to public
using (bucket_id = 'team-images');

drop policy if exists "Logged in users can delete event images" on storage.objects;
create policy "Logged in users can delete event images"
on storage.objects for delete to authenticated
using (bucket_id = 'event-images');

drop policy if exists "Logged in users can delete event posters" on storage.objects;
create policy "Logged in users can delete event posters"
on storage.objects for delete to authenticated
using (bucket_id = 'event-posters');

drop policy if exists "Logged in users can update event images" on storage.objects;
create policy "Logged in users can update event images"
on storage.objects for update to authenticated
using (bucket_id = 'event-images')
with check (bucket_id = 'event-images');

drop policy if exists "Logged in users can update event posters" on storage.objects;
create policy "Logged in users can update event posters"
on storage.objects for update to authenticated
using (bucket_id = 'event-posters')
with check (bucket_id = 'event-posters');

drop policy if exists "Logged in users can upload business images" on storage.objects;
create policy "Logged in users can upload business images"
on storage.objects for insert to authenticated
with check (bucket_id = 'business-images');

drop policy if exists "Logged in users can upload event images" on storage.objects;
create policy "Logged in users can upload event images"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-images');

drop policy if exists "Logged in users can upload event posters" on storage.objects;
create policy "Logged in users can upload event posters"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-posters');
