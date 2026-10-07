create table if not exists public.team_quick_forms (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  title text not null,
  slug text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  fields jsonb not null default '[]'::jsonb,
  confirmation_message text not null default 'Thank you. Your response has been received.',
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, slug)
);

create table if not exists public.team_quick_form_submissions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  form_id uuid not null references public.team_quick_forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  source text not null default 'website',
  submitted_at timestamptz not null default now()
);

create table if not exists public.team_quick_form_access_blocks (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  form_id uuid not null references public.team_quick_forms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  blocked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (user_id is not null or nullif(trim(email), '') is not null)
);

create unique index if not exists team_quick_form_access_user_unique
  on public.team_quick_form_access_blocks(form_id, user_id) where user_id is not null;
create unique index if not exists team_quick_form_access_email_unique
  on public.team_quick_form_access_blocks(form_id, lower(email)) where email is not null;
create index if not exists team_quick_form_submissions_form_idx
  on public.team_quick_form_submissions(form_id, submitted_at desc);

alter table public.team_quick_forms enable row level security;
alter table public.team_quick_form_submissions enable row level security;
alter table public.team_quick_form_access_blocks enable row level security;

comment on table public.team_quick_forms is 'Reusable forms collaboratively managed by eligible SDTV team members.';
comment on table public.team_quick_form_submissions is 'Validated public submissions for SDTV team quick forms.';
comment on table public.team_quick_form_access_blocks is 'Per-form team-member exclusions controlled only by super administrators.';
