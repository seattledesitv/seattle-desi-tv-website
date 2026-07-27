alter table if exists public.local_businesses
  add column if not exists image_display_mode text not null default 'cover';

alter table if exists public.community_organizations
  add column if not exists image_display_mode text not null default 'cover';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'local_businesses_image_display_mode_check'
  ) then
    alter table public.local_businesses
      add constraint local_businesses_image_display_mode_check
      check (image_display_mode in ('cover', 'contain', 'blur'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'community_organizations_image_display_mode_check'
  ) then
    alter table public.community_organizations
      add constraint community_organizations_image_display_mode_check
      check (image_display_mode in ('cover', 'contain', 'blur'));
  end if;
end $$;

notify pgrst, 'reload schema';
