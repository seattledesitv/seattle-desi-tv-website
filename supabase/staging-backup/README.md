# SDTV Supabase staging backup

Generated from the production Supabase metadata captured in this chat.

## Contents

- `restore-all.sql` — single-file restore script for a fresh staging Supabase project.
- `schema/tables.sql` — all captured public base table definitions.
- `schema/constraints.sql` — primary keys, foreign keys, unique constraints, and checks.
- `schema/indexes.sql` — indexes captured from production.
- `security/rls.sql` — RLS enable/disable state.
- `security/policies.sql` — public schema RLS policies.
- `functions/functions.sql` — database functions.
- `functions/triggers.sql` — triggers.
- `storage/buckets.sql` — storage buckets.
- `storage/storage-policies.sql` — storage object policies.
- `exports/*.json` — raw captured metadata for traceability.

## Captured scope

- Public base tables: 36
- Captured public base-table columns: 461
- Constraints: 80
- Indexes: 75
- Public policies: 100

## How to use

1. Create a new Supabase project for staging.
2. Open SQL Editor.
3. Paste and run `restore-all.sql`.
4. Create/add your staging admin user row in `public.admins`.
5. Point Vercel Preview environment variables to the staging Supabase project.

## Notes

The earlier count of 469 columns likely included public views or non-base-table objects. This kit is based on the 36 public BASE TABLES inventory and contains 461 captured base-table columns.
