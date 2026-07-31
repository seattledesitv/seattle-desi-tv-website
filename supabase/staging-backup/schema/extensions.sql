-- Extensions captured from production.
-- Some Supabase-managed extensions may already exist.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
