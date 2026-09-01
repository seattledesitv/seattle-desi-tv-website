# Multi-city development contract

Every public or operational content record belongs to exactly one row in `public.sites` through a non-null `site_id`. Authentication identities may be global, but submissions, roles, assignments, settings, communications, finance, and content are market-owned.

## Required implementation pattern

- Server components and API routes resolve the request market with `resolveCurrentSite()`.
- Client components read the market with `useCurrentSite()`.
- Supabase reads, updates, and deletes use `forSite(query, site.id)`.
- Inserts explicitly include `site_id: site.id`, even when a database trigger also inherits it from a parent.
- Child tables inherit and validate their `site_id` from the parent record using database triggers.
- Shared UI uses `SiteConfig` (`name`, `shortName`, `city`, `primaryHostname`, and `settings`) instead of hard-coded Seattle branding.
- A missing city-specific phone, email, social URL, or logo must be hidden or use a neutral asset; it must never silently use another city's contact identity.

## Global by design

Supabase authentication users are shared so one login can participate in more than one market. Super-admin identity is also global. Market participation and content access remain scoped by `site_id`.

## Build protection

`npm run check:multicity` scans content-query files. New files querying market-owned tables must include explicit site resolution/filtering or the build fails. Narrow exceptions must be documented in the guard's allowlist.

## Adding a new module

1. Add a non-null `site_id` foreign key and `(site_id, ...)` indexes in a migration.
2. Backfill existing records before making the column non-null.
3. Add site-aware uniqueness constraints and RLS policies.
4. Scope every read/write in public pages, My Hub, Studio, APIs, cron jobs, and emails.
5. Test with the preview override for SEA, SFO, and DAL before deployment.
