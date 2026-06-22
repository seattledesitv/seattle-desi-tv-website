-- Compatibility fix for homepage team_members query.
-- The QA report saw a 400 on team_members?...limit=6, which can happen if older environments
-- are missing optional image alias columns selected by the homepage.

alter table public.team_members
  add column if not exists photo text,
  add column if not exists picture text;

-- Keep these optional aliases populated from image when available.
update public.team_members
set
  photo = coalesce(photo, image),
  picture = coalesce(picture, image)
where image is not null;
