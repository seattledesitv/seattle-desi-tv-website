-- Match the image gallery constraint to the 30-image form and service limit.
begin;

alter table public.press_releases
  drop constraint if exists press_release_image_limit;

alter table public.press_releases
  add constraint press_release_image_limit check (cardinality(image_urls) <= 30);

commit;
