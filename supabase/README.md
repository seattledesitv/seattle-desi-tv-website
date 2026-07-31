# Seattle Desi TV Supabase schema workflow

This folder is the version-controlled home for SDTV database setup.

## Files

- `schema.sql` — the reusable master schema script for creating a fresh SDTV Supabase environment. This currently contains an older partial schema and should be refreshed from production before being used for staging.
- `schema-export-helper.sql` — read-only SQL queries to run in the production Supabase SQL Editor to collect the current live schema without using paid backups or the Supabase CLI.
- `exports/constraints.json` — captured production constraints export.

## Current capture status

Captured so far:

- Public table inventory: 36 tables
- Storage buckets: 5 buckets
- Storage policies
- RLS status: received in chat
- Functions: received in chat
- Triggers: received in chat
- Extensions: received in chat
- Constraints: saved to `exports/constraints.json`
- Indexes: received in uploaded export, not yet converted into schema SQL
- Public RLS policies: received in uploaded export, not yet converted into schema SQL

Still needed before `schema.sql` is complete:

- Full columns export for all 36 tables. The latest pasted columns output appears to stop around `event_crew_media_submissions`, so it does not yet cover every table.
- Full conversion of constraints, indexes, functions, triggers, RLS policies, and storage into executable SQL blocks.

## Recommended no-CLI staging setup

1. Open the production Supabase project.
2. Go to **SQL Editor**.
3. Open `schema-export-helper.sql` from this repo.
4. Run one section at a time.
5. Export/copy each result as CSV or JSON.
6. Use those outputs to rebuild/update `schema.sql`.
7. Create the staging Supabase project.
8. Run the updated `schema.sql` in staging SQL Editor.
9. Add safe sample data only; do not copy private production data.
10. Point Vercel Preview environment variables to the staging Supabase project.

## What to include in `schema.sql`

- Extensions
- Tables
- Primary keys, foreign keys, checks, unique constraints
- Indexes
- Views
- Public functions
- Triggers
- RLS enable statements
- RLS policies
- Storage bucket creation
- Storage policies
- Safe config seed data, such as homepage settings if needed

## What not to include

- Supabase service role keys or API tokens
- Real user private data
- Real event organizer private contact data unless intentionally needed
- Production social media access tokens

## Ongoing rule

Whenever a future SDTV feature adds or changes a table, policy, bucket, function, or trigger, update `schema.sql` in the same commit as the application code.
