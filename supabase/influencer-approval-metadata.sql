-- Optional approval metadata for influencer profile/admin review.
-- Safe to run after supabase/influencer-mvp.sql.

alter table public.influencer_profiles
add column if not exists approved_by text;

alter table public.influencer_profiles
add column if not exists approved_at timestamptz;

alter table public.event_influencer_intents
add column if not exists approved_by text;

alter table public.event_influencer_intents
add column if not exists approved_at timestamptz;
