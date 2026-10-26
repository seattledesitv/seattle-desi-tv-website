alter table public.team_quick_forms
  add column if not exists event_id uuid references public.events(id) on delete cascade;

create index if not exists team_quick_forms_event_idx
  on public.team_quick_forms(site_id, event_id, updated_at desc);

comment on column public.team_quick_forms.event_id is
  'Optional event this form belongs to. Event organizers and administrators can manage linked forms.';