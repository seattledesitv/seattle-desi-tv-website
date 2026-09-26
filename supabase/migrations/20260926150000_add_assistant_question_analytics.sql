create table if not exists public.assistant_question_analytics (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  question_redacted text not null check (char_length(question_redacted) between 1 and 300),
  category text not null default 'other',
  outcome text not null default 'answered',
  page_path text not null default '/',
  created_at timestamptz not null default now()
);

create index if not exists assistant_question_analytics_site_created_idx
  on public.assistant_question_analytics (site_id, created_at desc);

create index if not exists assistant_question_analytics_site_category_idx
  on public.assistant_question_analytics (site_id, category, created_at desc);

alter table public.assistant_question_analytics enable row level security;

revoke all on table public.assistant_question_analytics from anon, authenticated;
grant all on table public.assistant_question_analytics to service_role;

comment on table public.assistant_question_analytics is
  'Privacy-minimized analytics for public website assistant questions. No user id, IP address, email, phone, or session identifier is stored.';

comment on column public.assistant_question_analytics.question_redacted is
  'Question text after server-side redaction. Sensitive questions are withheld entirely.';
