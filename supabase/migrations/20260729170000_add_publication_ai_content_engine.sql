-- Publishing Platform Sprint 5B: AI prompt management and generation history.

create table if not exists public.publication_ai_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null unique,
  name text not null,
  target_type text not null check (target_type in ('item','section','publication')),
  system_prompt text not null,
  user_prompt_template text not null,
  active boolean not null default true,
  version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publication_generation_history (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  publication_section_id uuid references public.publication_sections(id) on delete cascade,
  publication_item_id uuid references public.publication_items(id) on delete cascade,
  target_type text not null check (target_type in ('item','section','publication')),
  prompt_key text not null,
  provider text not null,
  model text not null,
  status text not null default 'completed' check (status in ('completed','failed')),
  source_attribution jsonb not null default '{}'::jsonb,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_content jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists publication_generation_history_publication_idx
on public.publication_generation_history(publication_id, created_at desc);

create index if not exists publication_generation_history_item_idx
on public.publication_generation_history(publication_item_id, created_at desc);

alter table public.publication_ai_prompts enable row level security;
alter table public.publication_generation_history enable row level security;

drop policy if exists "Admins manage publication AI prompts" on public.publication_ai_prompts;
create policy "Admins manage publication AI prompts" on public.publication_ai_prompts for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Admins manage publication generation history" on public.publication_generation_history;
create policy "Admins manage publication generation history" on public.publication_generation_history for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

insert into public.publication_ai_prompts (prompt_key, name, target_type, system_prompt, user_prompt_template)
values
  ('editorial_item', 'Editorial item rewrite', 'item', 'You are an editor for Seattle Desi TV. Preserve facts and source attribution. Return valid JSON only.', 'Rewrite this publication item for clarity and community relevance.'),
  ('editorial_section', 'Editorial section rewrite', 'section', 'You are an editor for Seattle Desi TV. Create a cohesive section introduction without inventing facts. Return valid JSON only.', 'Improve this publication section using its included items.'),
  ('editorial_publication', 'Editorial publication review', 'publication', 'You are the senior editor for Seattle Desi TV. Create cohesive publication-level editorial copy without inventing facts. Return valid JSON only.', 'Improve the publication description and editorial summary.')
on conflict (prompt_key) do nothing;

comment on table public.publication_ai_prompts is 'Versioned administrator-managed prompts for the publication AI engine.';
comment on table public.publication_generation_history is 'Auditable AI generation attempts and source attribution for publications.';
