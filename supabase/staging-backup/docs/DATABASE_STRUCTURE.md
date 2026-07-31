# SDTV Database Structure

Captured public base tables: 36

## admins

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `user_id` | `uuid` | NO | `` |
| 2 | `email` | `text` | YES | `` |
| 3 | `role` | `text` | YES | `'admin'::text` |
| 4 | `created_at` | `timestamptz` | YES | `now()` |
| 5 | `name` | `text` | YES | `` |

## community_groups

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `name` | `text` | NO | `` |
| 3 | `platform` | `text` | YES | `` |
| 4 | `category` | `text` | YES | `` |
| 5 | `language` | `text` | YES | `` |
| 6 | `location` | `text` | YES | `` |
| 7 | `description` | `text` | YES | `` |
| 8 | `group_url` | `text` | YES | `` |
| 9 | `contact_name` | `text` | YES | `` |
| 10 | `contact_email` | `text` | YES | `` |
| 11 | `contact_phone` | `text` | YES | `` |
| 12 | `submitted_by` | `uuid` | YES | `` |
| 13 | `submitted_email` | `text` | YES | `` |
| 14 | `status` | `text` | NO | `'pending'::text` |
| 15 | `approved` | `boolean` | NO | `false` |
| 16 | `approved_by` | `text` | YES | `` |
| 17 | `approved_at` | `timestamptz` | YES | `` |
| 18 | `created_at` | `timestamptz` | NO | `now()` |
| 19 | `updated_at` | `timestamptz` | NO | `now()` |

## community_organizations

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `name` | `text` | NO | `` |
| 3 | `organization_type` | `text` | YES | `` |
| 4 | `category` | `text` | YES | `` |
| 5 | `location` | `text` | YES | `` |
| 6 | `website` | `text` | YES | `` |
| 7 | `description` | `text` | YES | `` |
| 8 | `contact_name` | `text` | YES | `` |
| 9 | `contact_email` | `text` | YES | `` |
| 10 | `contact_phone` | `text` | YES | `` |
| 11 | `submitted_by` | `uuid` | YES | `` |
| 12 | `submitted_email` | `text` | YES | `` |
| 13 | `status` | `text` | NO | `'pending'::text` |
| 14 | `approved` | `boolean` | NO | `false` |
| 15 | `approved_by` | `text` | YES | `` |
| 16 | `approved_at` | `timestamptz` | YES | `` |
| 17 | `created_at` | `timestamptz` | NO | `now()` |
| 18 | `updated_at` | `timestamptz` | NO | `now()` |

## contact_requests

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `name` | `text` | NO | `` |
| 3 | `email` | `text` | NO | `` |
| 4 | `phone` | `text` | YES | `` |
| 5 | `interest` | `text` | NO | `` |
| 6 | `message` | `text` | YES | `` |
| 7 | `created_at` | `timestamptz` | YES | `now()` |
| 8 | `status` | `text` | YES | `'new'::text` |
| 9 | `source` | `text` | YES | `'website_contact'::text` |
| 10 | `updated_at` | `timestamptz` | YES | `now()` |
| 11 | `admin_notes` | `text` | YES | `` |

## crew_availability

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | NO | `` |
| 3 | `user_email` | `text` | YES | `` |
| 4 | `available_date` | `date` | NO | `` |
| 5 | `status` | `text` | NO | `'available'::text` |
| 6 | `note` | `text` | YES | `` |
| 7 | `created_at` | `timestamptz` | YES | `now()` |
| 8 | `updated_at` | `timestamptz` | YES | `now()` |

## event_coverage_sources

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `event_id` | `uuid` | NO | `` |
| 3 | `source_type` | `text` | NO | `` |
| 4 | `status` | `text` | NO | `'pending'::text` |
| 5 | `source_url` | `text` | YES | `` |
| 6 | `platform` | `text` | YES | `` |
| 7 | `contact_name` | `text` | YES | `` |
| 8 | `contact_email` | `text` | YES | `` |
| 9 | `notes` | `text` | YES | `` |
| 10 | `requested_by` | `uuid` | YES | `` |
| 11 | `requested_at` | `timestamptz` | YES | `` |
| 12 | `submitted_at` | `timestamptz` | YES | `` |
| 13 | `created_at` | `timestamptz` | NO | `now()` |
| 14 | `updated_at` | `timestamptz` | NO | `now()` |

## event_crew_assignments

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `event_id` | `uuid` | YES | `` |
| 3 | `user_id` | `uuid` | YES | `` |
| 4 | `assignment_type` | `text` | YES | `'self_selected'::text` |
| 5 | `created_at` | `timestamptz` | YES | `now()` |
| 6 | `status` | `text` | YES | `'pending'::text` |
| 7 | `user_email` | `text` | YES | `` |
| 8 | `approved_by` | `text` | YES | `` |
| 9 | `approved_at` | `timestamptz` | YES | `` |
| 10 | `event_title` | `text` | YES | `` |
| 11 | `crew_confirmed` | `boolean` | YES | `false` |
| 12 | `coverage_completed` | `boolean` | YES | `false` |
| 13 | `coverage_notes` | `text` | YES | `` |
| 14 | `completed_at` | `timestamptz` | YES | `` |

## event_crew_media_submissions

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `assignment_id` | `uuid` | YES | `` |
| 3 | `event_id` | `uuid` | YES | `` |
| 4 | `user_id` | `uuid` | YES | `` |
| 5 | `user_email` | `text` | YES | `` |
| 6 | `has_content` | `boolean` | NO | `true` |
| 7 | `raw_video_url` | `text` | YES | `` |
| 8 | `photos_url` | `text` | YES | `` |
| 9 | `other_media_url` | `text` | YES | `` |
| 10 | `notes` | `text` | YES | `` |
| 11 | `status` | `text` | NO | `'submitted'::text` |
| 12 | `submitted_at` | `timestamptz` | NO | `now()` |
| 13 | `created_at` | `timestamptz` | NO | `now()` |
| 14 | `updated_at` | `timestamptz` | NO | `now()` |

## event_deliverables

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `event_id` | `uuid` | NO | `` |
| 3 | `deliverable_type` | `text` | NO | `` |
| 4 | `required` | `boolean` | NO | `true` |
| 5 | `completed` | `boolean` | NO | `false` |
| 6 | `completed_by` | `uuid` | YES | `` |
| 7 | `completed_by_email` | `text` | YES | `` |
| 8 | `completed_at` | `timestamptz` | YES | `` |
| 9 | `notes` | `text` | YES | `` |
| 10 | `created_at` | `timestamptz` | NO | `now()` |
| 11 | `updated_at` | `timestamptz` | NO | `now()` |

## event_influencer_intents

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `event_id` | `uuid` | YES | `` |
| 3 | `user_id` | `uuid` | YES | `` |
| 4 | `user_email` | `text` | NO | `` |
| 5 | `influencer_profile_id` | `uuid` | YES | `` |
| 6 | `status` | `text` | YES | `'pending'::text` |
| 7 | `collab_note` | `text` | YES | `` |
| 8 | `expected_platforms` | `text` | YES | `` |
| 9 | `post_url` | `text` | YES | `` |
| 10 | `created_at` | `timestamptz` | YES | `now()` |
| 11 | `updated_at` | `timestamptz` | YES | `now()` |
| 12 | `approved_by` | `text` | YES | `` |
| 13 | `approved_at` | `timestamptz` | YES | `` |

## event_video_notifications

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `workflow_id` | `uuid` | NO | `` |
| 3 | `recipient_email` | `text` | YES | `` |
| 4 | `recipient_user_id` | `uuid` | YES | `` |
| 5 | `notification_type` | `text` | NO | `` |
| 6 | `title` | `text` | NO | `` |
| 7 | `message` | `text` | YES | `` |
| 8 | `link` | `text` | YES | `` |
| 9 | `is_read` | `boolean` | NO | `false` |
| 10 | `created_at` | `timestamptz` | NO | `now()` |

## event_video_revisions

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `workflow_id` | `uuid` | NO | `` |
| 3 | `revision_number` | `integer` | NO | `1` |
| 4 | `full_video_url` | `text` | YES | `` |
| 5 | `reel_url` | `text` | YES | `` |
| 6 | `youtube_title` | `text` | YES | `` |
| 7 | `youtube_description` | `text` | YES | `` |
| 8 | `instagram_caption` | `text` | YES | `` |
| 9 | `thumbnail_url` | `text` | YES | `` |
| 10 | `feedback` | `text` | YES | `` |
| 11 | `submitted_by` | `uuid` | YES | `` |
| 12 | `submitted_by_email` | `text` | YES | `` |
| 13 | `created_at` | `timestamptz` | NO | `now()` |

## event_video_workflows

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `event_id` | `uuid` | NO | `` |
| 3 | `status` | `text` | NO | `'ready_for_editing'::text` |
| 4 | `assigned_editor_email` | `text` | YES | `` |
| 5 | `crew_reviewer_email` | `text` | YES | `` |
| 6 | `admin_approver_email` | `text` | YES | `` |
| 7 | `raw_media_url` | `text` | YES | `` |
| 8 | `external_media_url` | `text` | YES | `` |
| 9 | `crew_notes` | `text` | YES | `` |
| 10 | `editor_notes` | `text` | YES | `` |
| 11 | `publish_notes` | `text` | YES | `` |
| 12 | `youtube_url` | `text` | YES | `` |
| 13 | `instagram_url` | `text` | YES | `` |
| 14 | `facebook_url` | `text` | YES | `` |
| 15 | `created_by` | `uuid` | YES | `` |
| 16 | `updated_by` | `uuid` | YES | `` |
| 17 | `created_at` | `timestamptz` | NO | `now()` |
| 18 | `updated_at` | `timestamptz` | NO | `now()` |
| 19 | `crew_approved_at` | `timestamptz` | YES | `` |
| 20 | `admin_approved_at` | `timestamptz` | YES | `` |
| 21 | `published_at` | `timestamptz` | YES | `` |

## events

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `title` | `text` | NO | `` |
| 3 | `date` | `date` | NO | `` |
| 4 | `location` | `text` | YES | `` |
| 5 | `description` | `text` | YES | `` |
| 6 | `image` | `text` | YES | `` |
| 7 | `created_by` | `uuid` | YES | `` |
| 8 | `created_at` | `timestamptz` | YES | `now()` |
| 9 | `ticket_url` | `text` | YES | `` |
| 10 | `poc_email` | `text` | YES | `` |
| 11 | `poc_phone` | `text` | YES | `` |
| 12 | `crew_member_ids` | `uuid[]` | YES | `'{}'::uuid[]` |
| 13 | `image_urls` | `text[]` | YES | `'{}'::text[]` |
| 14 | `approved` | `boolean` | YES | `false` |
| 15 | `status` | `text` | YES | `'pending'::text` |
| 16 | `approved_by` | `text` | YES | `` |
| 17 | `approved_at` | `timestamptz` | YES | `` |
| 18 | `featured` | `boolean` | YES | `false` |
| 19 | `featured_order` | `integer` | YES | `0` |
| 20 | `coverage_brief` | `text` | YES | `` |
| 21 | `required_shots` | `text` | YES | `` |
| 22 | `interview_targets` | `text` | YES | `` |
| 23 | `sponsor_requirements` | `text` | YES | `` |
| 24 | `special_instructions` | `text` | YES | `` |

## featured_social_content

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `title` | `text` | NO | `` |
| 3 | `subtitle` | `text` | YES | `` |
| 4 | `platform` | `text` | NO | `'instagram'::text` |
| 5 | `content_url` | `text` | NO | `` |
| 6 | `thumbnail_url` | `text` | YES | `` |
| 7 | `button_text` | `text` | YES | `'View Post'::text` |
| 8 | `active` | `boolean` | YES | `true` |
| 9 | `featured` | `boolean` | YES | `true` |
| 10 | `display_order` | `integer` | YES | `1` |
| 11 | `start_date` | `date` | YES | `` |
| 12 | `end_date` | `date` | YES | `` |
| 13 | `created_at` | `timestamptz` | YES | `now()` |
| 14 | `updated_at` | `timestamptz` | YES | `now()` |
| 15 | `content_type` | `text` | YES | `'reel'::text` |

## festival_hero_assets

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `festival_name` | `text` | NO | `` |
| 3 | `festival_key` | `text` | NO | `` |
| 4 | `title` | `text` | YES | `` |
| 5 | `subtitle` | `text` | YES | `` |
| 6 | `image_url` | `text` | YES | `` |
| 7 | `start_date` | `date` | NO | `` |
| 8 | `end_date` | `date` | NO | `` |
| 9 | `active` | `boolean` | YES | `true` |
| 10 | `created_at` | `timestamptz` | YES | `now()` |
| 11 | `updated_at` | `timestamptz` | YES | `now()` |

## hero_analytics

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `hero_type` | `text` | YES | `` |
| 3 | `hero_id` | `text` | YES | `` |
| 4 | `event_id` | `uuid` | YES | `` |
| 5 | `viewed_at` | `timestamptz` | YES | `now()` |
| 6 | `clicked` | `boolean` | YES | `false` |
| 7 | `clicked_at` | `timestamptz` | YES | `` |

## homepage_hero_banners

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `title` | `text` | NO | `` |
| 3 | `subtitle` | `text` | YES | `` |
| 4 | `image_url` | `text` | YES | `` |
| 5 | `button_text` | `text` | YES | `` |
| 6 | `button_url` | `text` | YES | `` |
| 7 | `banner_type` | `text` | YES | `'marketing'::text` |
| 8 | `active` | `boolean` | YES | `true` |
| 9 | `start_date` | `date` | YES | `` |
| 10 | `end_date` | `date` | YES | `` |
| 11 | `display_order` | `integer` | YES | `0` |
| 12 | `created_at` | `timestamptz` | YES | `now()` |
| 13 | `updated_at` | `timestamptz` | YES | `now()` |

## homepage_settings

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `section_key` | `text` | NO | `` |
| 2 | `display_order` | `integer` | YES | `` |
| 3 | `enabled` | `boolean` | YES | `true` |
| 4 | `title` | `text` | YES | `` |
| 5 | `subtitle` | `text` | YES | `` |
| 6 | `updated_at` | `timestamptz` | NO | `now()` |

## homepage_sponsors

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `name` | `text` | NO | `` |
| 3 | `website` | `text` | YES | `` |
| 4 | `logo_url` | `text` | YES | `` |
| 5 | `display_order` | `integer` | YES | `0` |
| 6 | `active` | `boolean` | YES | `true` |
| 7 | `created_at` | `timestamptz` | YES | `now()` |
| 8 | `updated_at` | `timestamptz` | YES | `now()` |
| 9 | `tier` | `text` | YES | `` |

## homepage_testimonials

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `name` | `text` | NO | `` |
| 3 | `title` | `text` | YES | `` |
| 4 | `quote` | `text` | NO | `` |
| 5 | `image_url` | `text` | YES | `` |
| 6 | `display_order` | `integer` | YES | `1` |
| 7 | `active` | `boolean` | YES | `true` |
| 8 | `created_at` | `timestamptz` | YES | `now()` |
| 9 | `updated_at` | `timestamptz` | YES | `now()` |

## influencer_profiles

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | YES | `` |
| 3 | `email` | `text` | NO | `` |
| 4 | `full_name` | `text` | NO | `` |
| 5 | `city` | `text` | YES | `` |
| 6 | `bio` | `text` | YES | `` |
| 7 | `instagram_url` | `text` | YES | `` |
| 8 | `tiktok_url` | `text` | YES | `` |
| 9 | `youtube_url` | `text` | YES | `` |
| 10 | `website_url` | `text` | YES | `` |
| 11 | `photo_url` | `text` | YES | `` |
| 12 | `niche` | `text` | YES | `` |
| 13 | `follower_count` | `text` | YES | `` |
| 14 | `public_listing` | `boolean` | YES | `false` |
| 15 | `status` | `text` | YES | `'pending'::text` |
| 16 | `created_at` | `timestamptz` | YES | `now()` |
| 17 | `updated_at` | `timestamptz` | YES | `now()` |
| 18 | `approved_by` | `text` | YES | `` |
| 19 | `approved_at` | `timestamptz` | YES | `` |

## local_businesses

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `name` | `text` | NO | `` |
| 3 | `address` | `text` | NO | `` |
| 4 | `website` | `text` | YES | `` |
| 5 | `category` | `text` | YES | `` |
| 6 | `discount` | `text` | YES | `` |
| 7 | `offer` | `text` | YES | `` |
| 8 | `poc_name` | `text` | YES | `` |
| 9 | `poc_email` | `text` | YES | `` |
| 10 | `poc_phone` | `text` | YES | `` |
| 11 | `image` | `text` | YES | `` |
| 12 | `created_by` | `uuid` | YES | `` |
| 13 | `created_at` | `timestamptz` | YES | `now()` |
| 14 | `image_urls` | `text[]` | YES | `'{}'::text[]` |
| 15 | `approved` | `boolean` | YES | `false` |
| 16 | `status` | `text` | YES | `'pending'::text` |
| 17 | `approved_by` | `text` | YES | `` |
| 18 | `approved_at` | `timestamptz` | YES | `` |

## newsletter_campaigns

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `subject` | `text` | NO | `` |
| 3 | `preheader` | `text` | YES | `` |
| 4 | `status` | `text` | NO | `'draft'::text` |
| 5 | `draft_json` | `jsonb` | NO | `'{}'::jsonb` |
| 6 | `created_by` | `uuid` | YES | `` |
| 7 | `created_by_email` | `text` | YES | `` |
| 8 | `test_sent_to` | `text` | YES | `` |
| 9 | `test_sent_at` | `timestamptz` | YES | `` |
| 10 | `sent_at` | `timestamptz` | YES | `` |
| 11 | `created_at` | `timestamptz` | NO | `now()` |
| 12 | `updated_at` | `timestamptz` | NO | `now()` |

## newsletter_settings

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `section_key` | `text` | NO | `` |
| 2 | `display_order` | `integer` | NO | `1` |
| 3 | `enabled` | `boolean` | NO | `true` |
| 4 | `title` | `text` | YES | `` |
| 5 | `max_items` | `integer` | NO | `4` |
| 6 | `created_at` | `timestamptz` | NO | `now()` |
| 7 | `updated_at` | `timestamptz` | NO | `now()` |

## newsletter_subscribers

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `email` | `text` | NO | `` |
| 3 | `name` | `text` | YES | `` |
| 4 | `status` | `text` | NO | `'active'::text` |
| 5 | `verified` | `boolean` | NO | `false` |
| 6 | `source_page` | `text` | YES | `` |
| 7 | `unsubscribe_token` | `text` | NO | `(replace((gen_random_uuid())::text, '-'::text, ''::text) \|\| replace((gen_random_uuid())::text, '-'::text, ''::text))` |
| 8 | `notes` | `text` | YES | `` |
| 9 | `subscribed_at` | `timestamptz` | NO | `now()` |
| 10 | `confirmed_at` | `timestamptz` | YES | `` |
| 11 | `unsubscribed_at` | `timestamptz` | YES | `` |
| 12 | `created_at` | `timestamptz` | NO | `now()` |
| 13 | `updated_at` | `timestamptz` | NO | `now()` |

## notifications

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | YES | `` |
| 3 | `title` | `text` | YES | `` |
| 4 | `message` | `text` | YES | `` |
| 5 | `link` | `text` | YES | `` |
| 6 | `read` | `boolean` | YES | `false` |
| 7 | `created_at` | `timestamptz` | YES | `now()` |

## public_content_requests

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `submitter_name` | `text` | NO | `` |
| 3 | `submitter_email` | `text` | NO | `` |
| 4 | `submitter_phone` | `text` | YES | `` |
| 5 | `title` | `text` | NO | `` |
| 6 | `content_text` | `text` | YES | `` |
| 7 | `image_url` | `text` | YES | `` |
| 8 | `video_url` | `text` | YES | `` |
| 9 | `source_url` | `text` | YES | `` |
| 10 | `requested_channels` | `text[]` | YES | `'{}'::text[]` |
| 11 | `status` | `text` | NO | `'new'::text` |
| 12 | `assigned_editor_email` | `text` | YES | `` |
| 13 | `admin_notes` | `text` | YES | `` |
| 14 | `editor_notes` | `text` | YES | `` |
| 15 | `created_at` | `timestamptz` | NO | `now()` |
| 16 | `updated_at` | `timestamptz` | NO | `now()` |
| 17 | `assigned_at` | `timestamptz` | YES | `` |
| 18 | `published_at` | `timestamptz` | YES | `` |
| 19 | `final_youtube_url` | `text` | YES | `` |
| 20 | `final_instagram_url` | `text` | YES | `` |
| 21 | `final_facebook_url` | `text` | YES | `` |
| 22 | `final_website_url` | `text` | YES | `` |
| 23 | `final_thumbnail_url` | `text` | YES | `` |
| 24 | `review_requested_at` | `timestamptz` | YES | `` |
| 25 | `approved_at` | `timestamptz` | YES | `` |
| 26 | `submitter_user_id` | `uuid` | YES | `` |
| 27 | `submitter_city` | `text` | YES | `` |
| 28 | `submitter_profile_notes` | `text` | YES | `` |

## public_visibility_controls

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `email` | `text` | NO | `` |
| 2 | `user_id` | `uuid` | YES | `` |
| 3 | `public_visibility_disabled` | `boolean` | NO | `false` |
| 4 | `reason` | `text` | YES | `` |
| 5 | `disabled_at` | `timestamptz` | YES | `` |
| 6 | `disabled_by` | `text` | YES | `` |
| 7 | `updated_at` | `timestamptz` | YES | `now()` |

## radio_team_members

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `name` | `text` | NO | `` |
| 3 | `title` | `text` | NO | `` |
| 4 | `segment_name` | `text` | NO | `` |
| 5 | `image` | `text` | YES | `` |
| 6 | `created_by` | `uuid` | YES | `` |
| 7 | `created_at` | `timestamptz` | YES | `now()` |
| 8 | `user_id` | `uuid` | YES | `` |
| 9 | `email` | `text` | YES | `` |
| 10 | `show_on_public_radio` | `boolean` | NO | `true` |
| 11 | `updated_at` | `timestamptz` | NO | `now()` |

## social_media_stats

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `platform` | `text` | NO | `` |
| 2 | `followers` | `bigint` | YES | `` |
| 3 | `views` | `bigint` | YES | `` |
| 4 | `videos` | `bigint` | YES | `` |
| 5 | `updated_at` | `timestamptz` | YES | `now()` |
| 6 | `href` | `text` | YES | `` |

## sponsors

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `name` | `text` | YES | `` |
| 3 | `logo` | `text` | YES | `` |
| 4 | `website` | `text` | YES | `` |
| 5 | `tier` | `text` | YES | `` |
| 6 | `active` | `boolean` | YES | `true` |
| 7 | `created_at` | `timestamptz` | YES | `now()` |

## team_members

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `name` | `text` | NO | `` |
| 3 | `title` | `text` | NO | `` |
| 4 | `image` | `text` | YES | `` |
| 5 | `created_by` | `uuid` | YES | `` |
| 6 | `created_at` | `timestamptz` | YES | `now()` |
| 7 | `user_id` | `uuid` | YES | `` |
| 8 | `email` | `text` | YES | `` |
| 9 | `show_on_public_team` | `boolean` | NO | `true` |
| 10 | `updated_at` | `timestamptz` | NO | `now()` |
| 11 | `photo` | `text` | YES | `` |
| 12 | `picture` | `text` | YES | `` |

## user_profiles

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `user_id` | `uuid` | NO | `` |
| 2 | `email` | `text` | YES | `` |
| 3 | `full_name` | `text` | YES | `` |
| 4 | `profile_photo_url` | `text` | YES | `` |
| 5 | `role` | `text` | YES | `'general_public'::text` |
| 6 | `created_at` | `timestamptz` | YES | `now()` |
| 7 | `updated_at` | `timestamptz` | YES | `now()` |
| 8 | `preferred_name` | `text` | YES | `` |
| 9 | `phone` | `text` | YES | `` |
| 10 | `city` | `text` | YES | `` |
| 11 | `state` | `text` | YES | `` |
| 12 | `country` | `text` | YES | `` |
| 13 | `short_bio` | `text` | YES | `` |
| 14 | `instagram_url` | `text` | YES | `` |
| 15 | `facebook_url` | `text` | YES | `` |
| 16 | `linkedin_url` | `text` | YES | `` |
| 17 | `website_url` | `text` | YES | `` |
| 18 | `youtube_url` | `text` | YES | `` |
| 19 | `interests` | `text[]` | YES | `'{}'::text[]` |
| 20 | `show_name_publicly` | `boolean` | YES | `false` |

## user_role_requests

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | YES | `` |
| 3 | `email` | `text` | NO | `` |
| 4 | `requested_role` | `text` | NO | `'general_public'::text` |
| 5 | `status` | `text` | NO | `'pending'::text` |
| 6 | `approved_role` | `text` | YES | `` |
| 7 | `approved_by` | `text` | YES | `` |
| 8 | `approved_at` | `timestamptz` | YES | `` |
| 9 | `created_at` | `timestamptz` | YES | `now()` |
| 10 | `updated_at` | `timestamptz` | YES | `now()` |

## volunteer_onboarding_submissions

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | YES | `` |
| 3 | `email` | `text` | NO | `` |
| 4 | `volunteer_request_id` | `uuid` | YES | `` |
| 5 | `full_name` | `text` | NO | `` |
| 6 | `phone` | `text` | NO | `` |
| 7 | `city` | `text` | YES | `` |
| 8 | `interests` | `text` | YES | `` |
| 9 | `availability` | `text` | YES | `` |
| 10 | `experience` | `text` | YES | `` |
| 11 | `photo_url` | `text` | YES | `` |
| 12 | `emergency_contact` | `text` | YES | `` |
| 13 | `emergency_phone` | `text` | YES | `` |
| 14 | `agreement_acknowledged` | `boolean` | NO | `false` |
| 15 | `agreement_acknowledged_at` | `timestamptz` | YES | `` |
| 16 | `status` | `text` | NO | `'submitted'::text` |
| 17 | `created_at` | `timestamptz` | NO | `now()` |
| 18 | `updated_at` | `timestamptz` | NO | `now()` |
| 19 | `agreement_text` | `text` | YES | `` |
