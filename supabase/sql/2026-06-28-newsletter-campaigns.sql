create table if not exists newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preheader text,
  status text not null default 'draft' check (status in ('draft','test_sent','sent','archived')),
  draft_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_by_email text,
  test_sent_to text,
  test_sent_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_campaigns_status_idx on newsletter_campaigns(status);
create index if not exists newsletter_campaigns_created_at_idx on newsletter_campaigns(created_at desc);

alter table newsletter_campaigns enable row level security;
