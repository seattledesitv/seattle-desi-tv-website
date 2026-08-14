alter table public.press_releases
  add column if not exists documents jsonb not null default '[]'::jsonb;

alter table public.press_releases
  drop constraint if exists press_release_documents_shape;

alter table public.press_releases
  add constraint press_release_documents_shape check (
    jsonb_typeof(documents) = 'array'
    and jsonb_array_length(documents) <= 6
  );

comment on column public.press_releases.documents is
  'Public PDF and Word attachments stored as objects containing url, name, mime_type, and size_bytes.';
