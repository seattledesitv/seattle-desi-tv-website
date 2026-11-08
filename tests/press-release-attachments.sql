-- Run only against the empty CI database, never against a deployed project.
create table public.press_releases (
  documents jsonb not null default '[]'::jsonb,
  image_urls text[] not null default '{}',
  constraint press_release_documents_shape check (
    jsonb_typeof(documents) = 'array' and jsonb_array_length(documents) <= 6
  ),
  constraint press_release_image_limit check (cardinality(image_urls) <= 12)
);
alter table public.press_releases enable row level security;
insert into public.press_releases (documents) values ('[{"name":"existing.pdf"}]');
\ir ../supabase/migrations/20261108120000_increase_press_release_attachment_limit.sql
\ir ../supabase/migrations/20261108120000_increase_press_release_attachment_limit.sql

do $$
begin
  insert into public.press_releases (documents)
    select jsonb_agg(jsonb_build_object('name', 'photo-' || n || '.png')) from generate_series(1,30) n;
  if not exists (select 1 from public.press_releases where jsonb_array_length(documents) = 30) then
    raise exception '30 attachments were not accepted';
  end if;
  begin
    insert into public.press_releases (documents)
      select jsonb_agg(jsonb_build_object('name', 'photo-' || n || '.png')) from generate_series(1,31) n;
    raise exception '31 attachments were incorrectly accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.press_releases (documents) values ('{}');
    raise exception 'Non-array attachment data was incorrectly accepted';
  exception when check_violation or invalid_parameter_value then null;
  end;
  begin
    insert into public.press_releases (image_urls) values (array_fill('https://example.com/photo.png'::text, array[13]));
    raise exception 'The separate 12-image gallery limit changed';
  exception when check_violation then null;
  end;
  if not exists (select 1 from public.press_releases where documents = '[{"name":"existing.pdf"}]'::jsonb) then
    raise exception 'Existing attachment data changed';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.press_releases'::regclass) then
    raise exception 'Row level security was disabled';
  end if;
end;
$$;
