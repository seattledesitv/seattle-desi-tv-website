alter table public.publications
  drop constraint if exists publications_publication_type_check;

alter table public.publications
  add constraint publications_publication_type_check
  check (publication_type in ('monthly','quarterly','six_month','annual','custom','weekly_instagram'));

comment on constraint publications_publication_type_check on public.publications is
  'Supported editorial publication workflows, including the weekly Instagram events update.';
