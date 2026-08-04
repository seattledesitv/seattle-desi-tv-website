create table if not exists public.publication_status_history (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint publication_status_history_status_check check (
    from_status in ('draft','review','approved','scheduled','published','archived') and
    to_status in ('draft','review','approved','scheduled','published','archived')
  )
);

create index if not exists publication_status_history_publication_idx
  on public.publication_status_history(publication_id, created_at desc);

alter table public.publication_status_history enable row level security;

drop policy if exists "Admins manage publication status history" on public.publication_status_history;
create policy "Admins manage publication status history"
  on public.publication_status_history for all to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create or replace function public.transition_publication_status(
  target_publication_id uuid,
  target_status text,
  transition_note text default null
)
returns public.publications
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_publication public.publications;
  updated_publication public.publications;
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'Studio admin access required.';
  end if;

  select * into current_publication from public.publications where id = target_publication_id for update;
  if current_publication.id is null then raise exception 'Publication not found.'; end if;

  if not (
    (current_publication.status = 'draft' and target_status in ('review','archived')) or
    (current_publication.status = 'review' and target_status in ('draft','approved','archived')) or
    (current_publication.status = 'approved' and target_status in ('draft','published','archived')) or
    (current_publication.status = 'scheduled' and target_status in ('approved','published','archived')) or
    (current_publication.status = 'published' and target_status in ('draft','archived')) or
    (current_publication.status = 'archived' and target_status = 'draft')
  ) then
    raise exception 'Invalid publication status transition from % to %.', current_publication.status, target_status;
  end if;

  update public.publications
    set status = target_status, updated_by = auth.uid(), updated_at = now()
    where id = target_publication_id
    returning * into updated_publication;

  insert into public.publication_status_history(publication_id, from_status, to_status, note, changed_by)
  values (target_publication_id, current_publication.status, target_status, nullif(trim(transition_note), ''), auth.uid());

  return updated_publication;
end;
$$;

comment on table public.publication_status_history is 'Append-only editorial review and release-status audit history.';
comment on function public.transition_publication_status(uuid,text,text) is 'Validates and records an admin publication workflow transition atomically.';
