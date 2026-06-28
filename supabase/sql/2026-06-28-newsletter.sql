create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  status text not null default 'active' check (status in ('pending','active','unsubscribed','bounced')),
  verified boolean not null default false,
  source_page text,
  unsubscribe_token text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  notes text,
  subscribed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_subscribers_status_idx on newsletter_subscribers(status);
create index if not exists newsletter_subscribers_subscribed_at_idx on newsletter_subscribers(subscribed_at desc);

create table if not exists newsletter_settings (
  section_key text primary key,
  display_order integer not null default 1,
  enabled boolean not null default true,
  title text,
  max_items integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into newsletter_settings (section_key, display_order, enabled, title, max_items) values
  ('intro', 1, true, 'Opening Note', 1),
  ('events', 2, true, 'Upcoming Events', 5),
  ('tv', 3, true, 'Latest TV', 4),
  ('playlists', 4, true, 'Featured Series', 2),
  ('instagram', 5, true, 'Latest Instagram', 4),
  ('radio', 6, true, 'Radio Highlights', 3),
  ('businesses', 7, true, 'Local Business Spotlight', 3),
  ('community', 8, true, 'Community Updates', 5),
  ('groups', 9, true, 'Community Groups', 4),
  ('organizations', 10, true, 'Community Organizations', 4),
  ('closing', 11, true, 'Stay Connected', 1)
on conflict (section_key) do nothing;

alter table newsletter_subscribers enable row level security;
alter table newsletter_settings enable row level security;

-- Public visitors subscribe through the server API using the service role key.
-- Admin reads/writes are handled by existing authenticated admin UI and Supabase policies may be adjusted if needed.
