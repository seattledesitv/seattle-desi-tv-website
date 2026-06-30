# SDTV Supabase staging backup

This folder contains a version-controlled backup/rebuild kit for the Seattle Desi TV Supabase backend.

## Important status

This backup kit is **in progress**. It is not yet a full one-click restore because the uploaded columns export currently covers only 8 of the 36 production tables.

## Normal goal

When complete, staging setup should be:

1. Create a new Supabase project.
2. Open Supabase SQL Editor.
3. Run `restore-all.sql`.
4. Add safe staging seed data.
5. Point Vercel Preview environment variables to the staging Supabase project.

## Current structure

- `restore-all.sql` — final single-run restore file; currently guarded to prevent accidental partial restore.
- `schema/extensions.sql` — extension setup.
- `schema/tables.sql` — generated table definitions from the current columns export; currently partial.
- `schema/constraints.sql` — constraints captured from production.
- `schema/indexes.sql` — indexes captured from production.
- `security/rls.sql` — RLS enabled/disabled status.
- `security/policies.sql` — public schema RLS policies from uploaded export.
- `functions/functions.sql` — functions captured from production.
- `functions/triggers.sql` — triggers captured from production.
- `storage/buckets.sql` — storage buckets captured from production.
- `storage/storage-policies.sql` — storage policies captured from production.
- `seed/sample-data.sql` — placeholder for safe staging data.
- `exports/*.json` — raw export files for traceability.

## Still needed

Run the columns export again and capture all 36 tables. The current export stops at `event_crew_media_submissions`.

Use this query in Supabase SQL Editor:

```sql
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale,
  c.datetime_precision,
  c.is_nullable,
  c.column_default,
  c.is_identity,
  c.identity_generation,
  c.is_generated,
  c.generation_expression
from information_schema.columns c
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;
```

Export/download the full result if possible instead of copying from the visible result panel.
