-- Increase attachment capacity without altering the separate image gallery limit.
begin;

alter table public.press_releases
  drop constraint if exists press_release_documents_shape;

alter table public.press_releases
  add constraint press_release_documents_shape check (
    jsonb_typeof(documents) = 'array'
    and jsonb_array_length(documents) <= 30
  );

commit;
