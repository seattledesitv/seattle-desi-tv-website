# SDTV Supabase Restore Order

Run these SQL files in this exact order inside the Supabase SQL Editor for a fresh staging project.

## 01 - Extensions

File:

```text
supabase/staging-backup/schema/extensions.sql
```

Creates required extensions such as `pgcrypto` and `uuid-ossp`.

## 02 - Tables

File:

```text
supabase/staging-backup/schema/tables.sql
```

Creates all 36 public tables.

## 03 - Primary keys

File:

```text
supabase/staging-backup/v2/primary-keys.sql
```

Adds primary keys safely and idempotently.

Important special cases:

- `social_media_stats` primary key: `platform`
- `public_visibility_controls` primary key: `email`
- `homepage_settings` primary key: `section_key`
- `newsletter_settings` primary key: `section_key`
- `admins` primary key: `user_id`
- `user_profiles` primary key: `user_id`

## 04 - Unique and check constraints

File:

```text
supabase/staging-backup/v2/unique-and-checks.sql
```

Adds safe unique constraints and check constraints.

## 05 - Core foreign keys

File:

```text
supabase/staging-backup/v2/foreign-keys-core.sql
```

Adds high-confidence relationship foreign keys after primary keys exist.

## 06 - Indexes

File:

```text
supabase/staging-backup/schema/indexes.sql
```

Creates indexes.

If staging was partially created from an earlier attempt and this step reports a missing column, inspect the table and patch with `add column if not exists` from the latest `tables.sql` definition.

## 07 - Functions

File:

```text
supabase/staging-backup/functions/functions.sql
```

Creates functions.

## 08 - Triggers

File:

```text
supabase/staging-backup/functions/triggers.sql
```

Creates triggers after functions and tables exist.

## 09 - RLS state

File:

```text
supabase/staging-backup/security/rls.sql
```

Enables or disables RLS table-by-table.

## 10 - Policies

File:

```text
supabase/staging-backup/security/policies.sql
```

Creates public schema RLS policies.

Expected policy count after restore is about 100.

## 11 - Storage buckets

File:

```text
supabase/staging-backup/storage/buckets.sql
```

Creates storage bucket metadata.

Note: Most SDTV images are in Cloudinary, but these buckets may still be referenced by older features or fallback flows.

## 12 - Storage policies

File:

```text
supabase/staging-backup/storage/storage-policies.sql
```

Creates storage object policies.

## 13 - Validate

File:

```text
supabase/staging-backup/v2/validate-restore.sql
```

Expected key results:

```text
public_base_tables: 36
primary_keys: 36
public_policies: about 100
missing_primary_keys: none
```

## After validation

Create a staging admin user:

```sql
insert into public.admins (user_id, email, role, name)
values (
  '<STAGING_AUTH_USER_UUID>',
  'abharathkumar@gmail.com',
  'super_admin',
  'Bharath Kumar Arekapudi'
)
on conflict (user_id) do update set
  email = excluded.email,
  role = excluded.role,
  name = excluded.name;
```
