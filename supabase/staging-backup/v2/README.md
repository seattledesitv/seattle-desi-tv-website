# SDTV Supabase Restore v2

This folder contains the corrected restore sequence based on the first real staging setup.

## Why v2 exists

The original generated `restore-all.sql` exposed two restore issues:

1. Constraint existence checks used double quotes around constraint names, for example `conname = "events_pkey"`, which PostgreSQL treats as a column name.
2. Foreign keys were mixed before primary keys, causing errors when referenced tables did not yet have unique/primary constraints.

This v2 flow fixes that by restoring in a safe order.

## Recommended staging restore order

Run these files in Supabase SQL Editor in this order:

1. `../schema/extensions.sql`
2. `../schema/tables.sql`
3. `primary-keys.sql`
4. `unique-and-checks.sql`
5. `foreign-keys-core.sql`
6. `../schema/indexes.sql`
7. `../functions/functions.sql`
8. `../functions/triggers.sql`
9. `../security/rls.sql`
10. `../security/policies.sql`
11. `../storage/buckets.sql`
12. `../storage/storage-policies.sql`
13. `validate-restore.sql`

## Expected validation

- Public base tables: 36
- Primary keys: 36
- Public policies: about 100
- Functions: should include `is_sdtv_admin`, `set_updated_at`, `update_updated_at_column`, `mark_volunteer_onboarding_submitted`
- Triggers: should include homepage, team/radio, role request, and volunteer onboarding triggers

## Notes

- This v2 path is the current recommended method for creating SDTV staging.
- The original `restore-all.sql` should be considered historical until it is regenerated using this order.
- `social_media_stats` uses `platform` as its primary key, not `id`.
- `public_visibility_controls` uses `email` as its primary key.
