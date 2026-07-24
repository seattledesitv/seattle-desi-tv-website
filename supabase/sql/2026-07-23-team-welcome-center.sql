create table if not exists public.team_member_welcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  email text not null,
  team_member_id uuid null,
  whatsapp_invite_sent_at timestamptz null,
  whatsapp_joined_at timestamptz null,
  team_intro_shared_at timestamptz null,
  instagram_posted_at timestamptz null,
  completed_at timestamptz null,
  completed_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_member_welcomes_email_key unique (email)
);

create index if not exists team_member_welcomes_user_id_idx on public.team_member_welcomes(user_id);
create index if not exists team_member_welcomes_team_member_id_idx on public.team_member_welcomes(team_member_id);

alter table public.team_member_welcomes enable row level security;

drop policy if exists "admins manage team welcomes" on public.team_member_welcomes;
create policy "admins manage team welcomes"
on public.team_member_welcomes
for all
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and a.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and a.role in ('admin', 'super_admin')
  )
);

grant select, insert, update, delete on public.team_member_welcomes to authenticated;
