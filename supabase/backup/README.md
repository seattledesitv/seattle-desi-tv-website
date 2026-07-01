# Seattle Desi TV Supabase Backup Package

This is the canonical SDTV database restore guide.

Use this folder instead of guessing between the old generated `restore-all.sql` and the v2 patch files.

## Current status

Backup package version: `2026-06-30-v2`

This version is based on the first real staging restore and fixes the issues found in the original generated SQL:

- PostgreSQL constraint name quoting fixed.
- Primary keys run before foreign keys.
- `social_media_stats` uses `platform` as primary key.
- `public_visibility_controls` uses `email` as primary key.
- Restore is split into safe ordered steps.

## Restore method

Run the files listed in `restore-order.md` in order inside Supabase SQL Editor.

Do **not** use the old `supabase/staging-backup/restore-all.sql` until it is regenerated from the v2 flow.

## Main restore files

The canonical flow intentionally reuses the existing generated SQL files where they worked, and uses v2 files where the first generated SQL was wrong.

| Step | File |
|---|---|
| 01 | `supabase/staging-backup/schema/extensions.sql` |
| 02 | `supabase/staging-backup/schema/tables.sql` |
| 03 | `supabase/staging-backup/v2/primary-keys.sql` |
| 04 | `supabase/staging-backup/v2/unique-and-checks.sql` |
| 05 | `supabase/staging-backup/v2/foreign-keys-core.sql` |
| 06 | `supabase/staging-backup/schema/indexes.sql` |
| 07 | `supabase/staging-backup/functions/functions.sql` |
| 08 | `supabase/staging-backup/functions/triggers.sql` |
| 09 | `supabase/staging-backup/security/rls.sql` |
| 10 | `supabase/staging-backup/security/policies.sql` |
| 11 | `supabase/staging-backup/storage/buckets.sql` |
| 12 | `supabase/staging-backup/storage/storage-policies.sql` |
| 13 | `supabase/staging-backup/v2/validate-restore.sql` |

## After restore

1. Create staging auth users in Supabase Authentication.
2. Insert at least one row into `public.admins` for the staging admin user.
3. Configure Vercel Preview/Staging environment variables to use staging Supabase keys.
4. Test `/studio`, `/studio/database-backup`, `/events`, and `/businesses`.

## Recommended environment variables

For staging Vercel environment:

```text
NEXT_PUBLIC_SUPABASE_URL=<staging supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging publishable/anon key>
SUPABASE_SECRET_KEY=<staging secret key>
```

The application also supports the legacy variable name:

```text
SUPABASE_SERVICE_ROLE_KEY=<staging secret key>
```
