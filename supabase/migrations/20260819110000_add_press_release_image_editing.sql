alter table public.press_releases
  add column if not exists image_position_x numeric not null default 50 check (image_position_x between 0 and 100),
  add column if not exists image_position_y numeric not null default 50 check (image_position_y between 0 and 100),
  add column if not exists image_zoom numeric not null default 1 check (image_zoom between 1 and 1.8),
  add column if not exists image_display_mode text not null default 'cover'
    check (image_display_mode in ('cover', 'contain', 'blur'));

drop policy if exists "Owners update unpublished press releases" on public.press_releases;

create policy "Owners update their press releases"
  on public.press_releases for update to authenticated
  using (created_by = auth.uid() and status <> 'archived')
  with check (created_by = auth.uid() and status = 'pending');

comment on column public.press_releases.image_position_x is 'Horizontal focal position for the primary card image.';
comment on column public.press_releases.image_position_y is 'Vertical focal position for the primary card image.';
comment on column public.press_releases.image_zoom is 'Primary card image zoom from 1.0 through 1.8.';
comment on column public.press_releases.image_display_mode is 'Primary card image rendering mode: cover, contain, or blur.';
