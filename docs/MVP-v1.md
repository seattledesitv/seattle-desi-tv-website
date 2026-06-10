# Seattle Desi TV MVP v1 Backup

Backup date: June 10, 2026

## MVP Git Snapshot

Recommended release tag: `v1.0.0-mvp`

Recommended backup branch: `release/mvp-v1`

Current MVP commit to preserve:

`6ff953a09f8794d054f00ac68a7d4a9852a557d3`

## MVP Scope

This MVP includes the following public and authenticated areas:

- Homepage
- Events
- Business Directory
- Radio
- Team
- Contact Us
- My Hub
- Studio/Admin areas
- Coverage workflow
- Crew assignments
- Notifications
- Volunteer Recognition leaderboard
- Recognition points and badges

## Public URLs to Validate

- `/`
- `/events`
- `/businesses`
- `/radio`
- `/team`
- `/contact`
- `/recognition`

## Authenticated URLs to Validate

- `/login`
- `/my-hub`
- `/my-assignments`
- `/my-availability`
- `/my-events`
- `/my-businesses`
- `/my-coverage`
- `/my-contact-requests`
- `/my-role-requests`
- `/notifications`

## Admin URLs to Validate

- `/studio`
- `/studio/events`
- `/studio/businesses`
- `/studio/contact-requests`
- `/studio/coverage`

## Environment Variables to Preserve

Do not store secret values in GitHub. Store the actual values safely in Vercel/Supabase/Cloudinary account records.

Required public/client variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

Required server/private variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `CONTACT_EMAIL_FROM`
- `CONTACT_EMAIL_TO`
- `TURNSTILE_SECRET_KEY`

## Database Tables to Backup

- `admins`
- `contact_requests`
- `crew_availability`
- `event_crew_assignments`
- `events`
- `homepage_hero_banners`
- `homepage_settings`
- `homepage_sponsors`
- `local_businesses`
- `notifications`
- `radio_team_members`
- `social_media_stats`
- `team_members`
- `user_role_requests`
- `volunteer_onboarding_submissions`

## Cloudinary Folders to Backup

- `seattle-desi-tv/events`
- `seattle-desi-tv/businesses`
- `sdtv/volunteer-profiles`

## Vercel Snapshot Info to Record

After deployment, record:

- Production deployment URL
- Commit SHA
- Build status
- Deployment date/time
- Environment used

## Restore Notes

To restore MVP v1:

1. Checkout the release branch or tag.
2. Restore Supabase schema/data from backup.
3. Restore Cloudinary assets if needed.
4. Confirm Vercel environment variables.
5. Redeploy the MVP commit.

## Post-MVP Work Deferred

The following features are intentionally deferred after MVP v1:

- Volunteer onboarding status tracker
- Full onboarding form workflow
- Volunteer spotlight
- Recognition certificates
- More advanced ranking logic
- Marketplace cohort expansion
