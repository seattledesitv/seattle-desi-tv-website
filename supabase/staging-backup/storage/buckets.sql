-- Storage buckets captured from production.

insert into storage.buckets (id, name, public)
values
  ('business-images', 'business-images', true),
  ('event-images', 'event-images', true),
  ('event-posters', 'event-posters', true),
  ('radio-team-images', 'radio-team-images', true),
  ('team-images', 'team-images', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;
