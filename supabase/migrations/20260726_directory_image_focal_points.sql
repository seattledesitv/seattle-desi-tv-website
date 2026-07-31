alter table if exists public.local_businesses
  add column if not exists image_position_x numeric not null default 50,
  add column if not exists image_position_y numeric not null default 50,
  add column if not exists image_zoom numeric not null default 1;

alter table if exists public.community_organizations
  add column if not exists image text,
  add column if not exists image_position_x numeric not null default 50,
  add column if not exists image_position_y numeric not null default 50,
  add column if not exists image_zoom numeric not null default 1;

alter table if exists public.local_businesses
  drop constraint if exists local_businesses_image_position_x_check,
  drop constraint if exists local_businesses_image_position_y_check,
  drop constraint if exists local_businesses_image_zoom_check;

alter table if exists public.local_businesses
  add constraint local_businesses_image_position_x_check check (image_position_x between 0 and 100),
  add constraint local_businesses_image_position_y_check check (image_position_y between 0 and 100),
  add constraint local_businesses_image_zoom_check check (image_zoom between 1 and 2);

alter table if exists public.community_organizations
  drop constraint if exists community_organizations_image_position_x_check,
  drop constraint if exists community_organizations_image_position_y_check,
  drop constraint if exists community_organizations_image_zoom_check;

alter table if exists public.community_organizations
  add constraint community_organizations_image_position_x_check check (image_position_x between 0 and 100),
  add constraint community_organizations_image_position_y_check check (image_position_y between 0 and 100),
  add constraint community_organizations_image_zoom_check check (image_zoom between 1 and 2);
