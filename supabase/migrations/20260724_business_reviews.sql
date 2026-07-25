-- Moderated ratings and comments for local business listings.
create table if not exists public.business_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.local_businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null,
  reviewer_email text,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) between 3 and 1200),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  moderation_notes text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists business_reviews_business_status_idx on public.business_reviews(business_id, status);
create index if not exists business_reviews_status_created_idx on public.business_reviews(status, created_at desc);

alter table public.business_reviews enable row level security;

drop policy if exists "Public can read approved business reviews" on public.business_reviews;
create policy "Public can read approved business reviews"
on public.business_reviews for select
using (status = 'approved' or auth.uid() = user_id or exists (
  select 1 from public.admins a where a.user_id = auth.uid()
));

drop policy if exists "Signed in users can create business reviews" on public.business_reviews;
create policy "Signed in users can create business reviews"
on public.business_reviews for insert
to authenticated
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Users can update their pending business reviews" on public.business_reviews;
create policy "Users can update their pending business reviews"
on public.business_reviews for update
to authenticated
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Admins can moderate business reviews" on public.business_reviews;
create policy "Admins can moderate business reviews"
on public.business_reviews for update
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create or replace function public.touch_business_review_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists business_reviews_touch_updated_at on public.business_reviews;
create trigger business_reviews_touch_updated_at
before update on public.business_reviews
for each row execute function public.touch_business_review_updated_at();
