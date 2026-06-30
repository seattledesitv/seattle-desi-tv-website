-- Extensions captured from production.
-- Some Supabase-managed extensions may already exist or may not be enabled on Free projects.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
-- pg_stat_statements, plpgsql, and supabase_vault are Supabase-managed; do not force-create them here.
