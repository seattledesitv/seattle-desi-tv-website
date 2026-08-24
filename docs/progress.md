# SDTV Platform Progress

## Current status

- Approved press releases can now be published to Instagram from Studio using selected release images, an editable generated caption, a preview, and a mandatory final approval step. The workflow reuses the protected shared Instagram API and credentials.
- Public Team member cards now prefer the user profile/volunteer photo, fall back to the team-member image, and use the SDTV ID badge only as the final image fallback.
- The public Events page now defaults to upcoming approved events and includes a compact Previous Events switch. Previous events retain their detail and map links but suppress expired registration, coverage, and influencer actions.
- Studio User Control now shows authoritative Supabase Authentication account totals, confirmation and sign-in counts, registration dates, last sign-in dates, and a complete registered-account table. Admins can delete non-self login access with typed-email confirmation while preserving linked platform records; administrator deletion is super-admin-only. No SQL migration is required; the existing server-only Supabase service credential is required.

- Press-release submitters can edit their own non-archived releases, while Studio administrators can edit every release. The shared editor supports text, metadata, documents, image additions/removals, primary-image selection, and business-style card framing. Owner edits return to moderation; administrator edits preserve status. Migration required: `20260819110000_add_press_release_image_editing.sql`.

- SEO-friendly canonical public URLs now use readable titles plus stable IDs for events, businesses, organizations, classifieds, press releases, and publications; legacy UUID-only links remain compatible.

- Active branch: `feature/publishing-platform-v2`
- Publishing Platform Sprints 1–4: complete
- Publishing Platform Sprint 5A: complete
- Publishing Platform Sprint 5B: code complete; migration and provider key required for live use
- Publishing Platform Sprint 6: complete
- Publishing Platform Sprint 7 internal pipeline: complete
- Publishing Platform Sprint 8 content completeness: complete
- Publishing Platform Sprint 9 sharing quality: complete
- Publishing Platform Sprint 10 channel handoffs: complete
- Publishing Platform Sprint 11 subscriber email delivery: complete
- External automatic channel adapters: intentionally pending credentials and provider-specific implementation
- Deployment and merge status: not performed by the Sprint 4 development work

## Completed publishing foundation

Sprints 1–3 established:

- Publication database schema
- Publication repositories and services
- Section registry and section engine
- Content discovery and publication snapshots
- Publication-item repository and service

## Sprint 4 — Editorial Workspace

Completed functionality:

- Publication-item state hook
- Loading, refresh, errors, optimistic mutations, and rollback
- Two-second debounced autosave with saved/saving/error indicators
- Automatic and manual retry
- Stale-request protection for concurrent edits
- Include/exclude and feature/unfeature
- Title, description, image URL, and destination URL editing
- Item deletion
- Drag-and-drop and move-button ordering
- Responsive section selector, item list, editor, toolbar, and live preview
- Status badges for Included, Excluded, Featured, and Edited
- Studio navigation to the item workspace
- Service-boundary authorization for the editorial page

## Build readiness completed

- Replaced obsolete Next.js lint command with ESLint 9 flat configuration.
- Added a dependency lockfile.
- Updated the TypeScript target from ES5 to ES2017.
- Recorded Next.js-required TypeScript settings.
- Normalized browser Supabase clients to the shared prerender-safe helper.
- Verified the production build through compilation, TypeScript, page-data collection, and generation of all 155 static pages.
- Verified targeted Sprint 4 lint with zero errors.

## Database changes in Sprint 4

No new Sprint 4 migration was required. The editorial workspace uses the existing publication-item schema and service layer.

## Sprint 5A — Unified Publication Editor

Completed functionality:

- One `Open Editor` action from each publication card
- Single editor URL for sections, items, discovery, and preview
- Responsive section rail with selection, drag-and-drop, and move controls
- Add and delete custom text sections
- Preserve built-in sections by using inclusion/exclusion instead of deletion
- Embedded approved-content discovery, filtering, selection, and snapshot import
- Existing item workspace and autosave reused without duplication
- Existing section editor and preview reused without duplication
- Repository, service, hook, and component boundaries maintained

No migration was required. Custom text sections use the existing publication-section schema and RLS policies.

## Known issues

- Repository-wide lint reports legacy findings outside Sprint 4, primarily explicit `any` usage and newer React lint rules in existing modules. These should be handled as scoped maintenance rather than mixed into publishing sprints.
- A Vercel preview should be verified from the current feature-branch head before any merge.
- Production environment variables remain required for live Supabase operations even though prerender uses a safe placeholder client.

## Sprint 5B recommendation

Completed functionality:

- Secure admin-only AI generation API
- Existing Gemini-first/OpenAI-fallback provider convention
- Item, section, and publication regeneration controls
- Review-before-apply workflow that protects manual edits
- Source attribution captured with item generation
- Versioned administrator prompt management
- Auditable generation success and failure history
- No additional npm dependency

Operational requirements:

- Apply `20260729170000_add_publication_ai_content_engine.sql` to Supabase.
- Configure `GEMINI_API_KEY` or `OPENAI_API_KEY` for live generation.

## Sprint 6 recommendation

Completed functionality:

- Canonical complete-publication preview model
- Website preview
- Newsletter preview
- Instagram preview
- Facebook preview
- LinkedIn preview
- Mobile preview
- Print/PDF preview
- Native Print / Save PDF workflow
- Standalone HTML export
- Structured JSON export
- Included-section and included-item filtering
- Responsive preview controls within the unified editor

No database migration or npm dependency was required for Sprint 6.

## Sprint 7 recommendation

Completed functionality:

- Website, newsletter, Instagram, Facebook, LinkedIn, PDF, and email channel selection
- Canonical output snapshot generation
- Immediate and scheduled output preparation
- Per-channel output status
- Explicit confirmation before publishing handoff
- Retry pathway for failed outputs
- Scheduled-output cancellation
- Publishing history and immutable attempt audit records
- Attempt count, last error, and last-attempt tracking
- Isolated channel adapter registry
- Safe manual-handoff default for every external channel

Operational requirements:

- Apply `20260730100000_add_publication_pipeline_history.sql` to Supabase.
- Apply the earlier Sprint 5 AI migration if it is not already installed.
- Implement and test provider-specific automatic adapters only after credentials and publishing-account requirements are confirmed.

## Sprint 8 — Content completeness

Completed functionality:

- Homepage hero and cover-image discovery
- Featured social content for Highlights and Videos
- Team content for Recognition
- Live Events, Businesses, Coverage Requests, Team Members, Radio Hosts, and Social Followers statistics
- Homepage-aligned Volunteer, Sponsor, Submit Content, and Request Coverage actions
- Cover image hero rendering across publication previews
- Purpose-built statistics and Get Involved preview layouts
- Rich standalone HTML export with images, links, responsive styling, and print rules
- Existing editorial include/exclude, feature, ordering, and manual editing retained for every imported item

No database migration or npm dependency was required. Existing publications receive the richer content after the editor runs Discover Content and adds the selected results.

Recommended next work:

- Push and apply the pending Sprint 7 pipeline migration before testing Publish mode.
- Verify the complete publication with authenticated feature-branch data, including Print / Save PDF.
- Implement provider-specific automatic delivery adapters only after credentials and account requirements are available.

## Sprint 9 — Sharing quality

Completed functionality:

- Latest YouTube videos available directly in publication discovery
- Latest Instagram posts and reels available as community highlights
- Instagram video posts also populate Videos as clearly labeled Instagram Reels
- YouTube and Instagram platform badges shown on publication cards
- Existing server-side social API integrations reused without exposing credentials
- Homepage-style Get Involved preview with four clear action buttons
- Correct public contact routes for Volunteer, Sponsorship, and Event Coverage
- Working Submit Content route
- Letter-size magazine print layout with a dedicated cover page
- Improved print colors, page breaks, item grids, image sizing, and link preservation
- Print-safe Get Involved contrast when browser background graphics are disabled
- Production base URL added to downloaded HTML so internal links work outside the website
- Publishing pipeline now displays the original Supabase/service error instead of masking it with a generic message

No database migration or npm dependency was required.

Validation:

- Targeted ESLint passed
- Full TypeScript check passed
- Production build passed and generated all 156 routes
- Automated browser/PDF visual inspection was blocked by the local Windows app sandbox; verify Print / Save PDF from the authenticated feature preview with real content before release

## Sprint 10 — Channel handoff packages

Completed functionality:

- Versioned channel-output payload contract
- Website HTML handoff package
- Newsletter and email subject, preheader, text, and responsive HTML packages
- Instagram, Facebook, and LinkedIn captions with bounded length and hashtags
- PDF print-ready HTML handoff package
- Deduplicated media asset references with source links
- Download controls for HTML and text packages
- Copy-text controls for manual social and editorial workflows
- Channel package summaries and media counts
- Clear legacy-snapshot treatment without rewriting history
- Existing manual confirmation and no-automatic-posting safety preserved

No database migration or npm dependency was required.

Validation:

- Targeted ESLint passed
- Full TypeScript check passed
- Production build passed and generated all 156 routes

Operational requirements:

- Apply `20260730100000_add_publication_pipeline_history.sql` if Generate Outputs reports a missing table or column.
- Generate new channel outputs after this sprint; older generic snapshots are intentionally marked as legacy.
- Verify downloaded HTML and social copy using authenticated feature-branch data before release.

## Sprint 11 — Subscriber email delivery

Completed functionality:

- Dedicated email delivery controls in the publication pipeline
- Test email to an editor-supplied address
- Successful test required within 24 hours before subscriber delivery
- Explicit confirmation before sending to all active subscribers
- Server-side admin authorization and server-only credentials
- Active-subscriber filtering and email deduplication
- Personalized subscription-management links
- Resend batch delivery in groups of at most 100
- Per-output, per-subscriber delivery ledger
- Duplicate prevention for successful recipients during retries
- Test, success, and failure events recorded in publishing history
- Email output marked published only after pending subscriber batches are accepted

Migration:

- `20260730143000_add_publication_email_delivery.sql`
- Adds `publication_email_deliveries`, indexes, admin RLS, and `email_test` / `email_send` publishing-attempt actions

Operational requirements:

- Apply the Sprint 11 migration before testing email delivery.
- Configure `RESEND_API_KEY`, `NEWSLETTER_FROM_EMAIL`, and `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` in the feature-preview environment.
- Use a verified Resend sender domain for subscriber delivery.
- Send and inspect a test email before using Send to active subscribers.

Validation:

- Targeted ESLint passed
- Full TypeScript check passed
- Production build passed and generated all 157 routes

## Sprint 12 — Weekly Events Instagram carousel

Completed functionality:

- Publication-native Events → Instagram workspace
- Reuses the publication's included event items and edited flyer/title/link fields
- Event selection and carousel ordering without duplicating source event data
- Editable cover headline, week label, introduction, caption, and hashtags
- Branded 1080 × 1350 cover and individual event-flyer slides
- Browser previews and individual PNG downloads
- Cloudinary upload only after editor review
- Single-image and multi-image carousel support in the existing Instagram publisher
- Ten-slide Instagram limit enforced as one cover plus up to nine events
- Explicit final confirmation before any external Instagram post

No database migration or npm dependency was required.

Validation:

- Targeted ESLint passed
- Full TypeScript check passed
- Production build passed and generated all 157 routes

Operational notes:

- Flyer rendering requires public images that permit browser canvas access; SDTV Cloudinary event flyers support this workflow.
- Automatic posting still requires the existing Instagram credentials and Cloudinary upload configuration in the preview environment.
- No Instagram post was made during implementation or validation.

### Sprint 12 follow-up — Weekly workflow and publish approval

- Added Weekly Instagram Events Update to the new-publication type selector.
- Added a versioned database constraint migration for the new publication type.
- Weekly Instagram publications open directly in Events → Instagram mode.
- Selecting the workflow pre-fills a sensible publication name and description when those fields are empty.
- Replaced the final publish checkbox with a deliberate two-button sequence: Everything looks good, followed by Publish carousel to Instagram.
- Approval is tied to the exact uploaded image URLs and becomes invalid if the images change.

Migration:

- `20260730170000_add_weekly_instagram_publication_type.sql`

## Sprint 13 — Email rendering and public publication archive

Completed functionality:

- Replaced browser-oriented newsletter HTML with email-safe inline styles and presentation tables.
- Preserved the publication hero, section hierarchy, images, descriptions, links, Get Involved actions, and SDTV branding in email clients.
- Consolidated the duplicate Newsletter and Email choices into one Newsletter email workflow.
- Preserved previous newsletter records as legacy history without rewriting them.
- Bumped generated channel packages to version 2 so older email markup cannot accidentally be resent as current output.
- Added a public `/publications` archive for published editions.
- Added shareable `/publications/[publicationId]` edition pages using the canonical publication preview.
- Added Publications to the site footer.
- Website publishing now marks the publication public, records the public URL, and exposes an Open public publication link in Studio.
- Public pages rely on the existing published-only RLS policies; drafts remain inaccessible to anonymous visitors.

No database migration or npm dependency was required.

Validation:

- Targeted ESLint passed.
- Full TypeScript check passed.
- Production build passed and generated all 158 routes.
- No test or subscriber email was sent and no website edition was published during validation.

Operational testing:

- Generate a new Newsletter email output; previous package-v1 outputs are intentionally treated as legacy.
- Send a test email and inspect it in the actual Gmail/Outlook/mobile clients used by SDTV.
- Generate Website output, press Publish to website, then verify its public link and the footer archive before subscriber delivery.

### Sprint 13 follow-up — Professional compact layouts

- Reviewed the supplied 49-page Gmail print sample and confirmed full-width media, long copy, and card/page fragmentation as the primary causes of excessive length.
- Reworked Newsletter email into a compact editorial digest with small thumbnail rows, featured-first ordering, short excerpts, and a maximum of five items per section.
- Added full-edition links for content intentionally summarized in email.
- Added Cloudinary delivery transforms for consistently cropped, optimized email thumbnails and hero media.
- Reduced website hero height, card image height, padding, and copy density.
- Added a responsive three-column website grid on large screens and three-line description limits.
- Made the final Weekly Events Instagram caption editable with a 2,200-character counter and generated-caption reset.
- Instagram approval now signs both the uploaded images and final caption; editing either requires fresh approval.
- Bumped current channel packages to version 3 so previous spacious email packages cannot be sent as current output.

Validation:

- Targeted ESLint passed.
- Full TypeScript check passed.
- Production build passed and generated all 158 routes.
- No email, Instagram post, website publication, deployment, or merge occurred.

## Sprint 14 — Editorial review and release approval

Completed functionality:

- Added a Review & approve workspace to the unified publication editor.
- Added controlled Draft, In review, Approved, Published, and Archived transitions.
- Approval requires an editorial note.
- Added an append-only status transition history with editor identity and timestamps.
- Added an atomic database function that validates, updates, and audits status changes.
- Added review readiness indicators for publication name, edition, description, and review state.
- Website publishing now records the Approved → Published workflow transition.
- Subscriber delivery is blocked until the publication is approved; test emails remain available for review.
- Publication-based Instagram delivery is blocked until approval.
- Publishing-pipeline controls clearly display and enforce approval requirements.
- Server routes repeat approval validation so UI state cannot bypass release controls.

Migration:

- `20260731100000_add_publication_review_workflow.sql`
- Adds `publication_status_history`, its publication/time index, admin RLS, and `transition_publication_status`.

Validation:

- Targeted ESLint passed.
- Full TypeScript check passed.
- Production build passed and generated all 158 routes.
- No email, Instagram post, website publication, deployment, or merge occurred.

Operational requirement:

- Apply the Sprint 14 migration before opening Review & approve or attempting a status transition.

Recommended next sprint:

- Sprint 15 — Scheduling operations: due-job processing, scheduled release controls, cancellation/retry behavior, and operational visibility for website and subscriber delivery.

### Sprint 14 follow-up — Editor experience optimization

- Replaced eight equal-priority editor tabs with a four-stage workflow: Build, Preview, Approve, and Publish.
- Grouped contextual tools under the stage where staff need them.
- Added plain-language guidance describing the purpose of every stage.
- Kept the publication status visible beside the publication title.
- Added horizontally scrollable workflow navigation for small screens.
- Limited the section rail to Section, Items, and AI editing where section context is required.
- Gave discovery, channel preview, Events Instagram, approval, and publishing the full workspace width.
- Preserved all existing editor modes, services, routes, and autosave behavior.

Validation:

- Targeted ESLint passed.
- Full TypeScript check passed.
- Production build passed and generated all 158 routes.
- No content was sent, published, deployed, or merged.

## Sprint 15 — Social publication launch studio

- Further condensed the website edition with a shorter hero, four-column wide-screen grid, 16:9 thumbnails capped at 112px, tighter spacing, and two-line summaries.
- Applied the same compact treatment to downloadable website HTML.
- Added Social launch under Preview in the unified publication editor.
- Added branded launch-image generation in native Instagram, Facebook, and LinkedIn dimensions.
- Added independent, editable captions with the canonical public-publication link.
- Added Cloudinary upload and per-channel review indicators.
- Approval is bound to the exact uploaded image and caption; either changing invalidates it.
- Direct social publishing is locked until the website edition is Published and requires a final browser confirmation.
- Reused the existing Instagram publisher and added authenticated Facebook Page and LinkedIn organization adapters.
- No database migration or new npm dependency was required.

Provider configuration:

- Facebook: `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`; optional `META_GRAPH_API_VERSION`.
- LinkedIn: `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN`, `LINKEDIN_API_VERSION`.
- Existing Instagram and Cloudinary variables remain required for those operations.

Safety:

- No social post, website publication, email, deployment, or merge occurred during implementation or validation.

### Sprint 15 follow-up — Instagram publication mockup

- Replaced the Instagram launch cover with a polished 1080×1350 publication-preview composition.
- The design includes the real publication hero, edition label, title, and up to four included section teasers.
- Added a browser-style newsletter frame, SDTV branding, launch status, and Read Now call-to-action.
- The generated image remains reviewable, downloadable, uploadable, and approval-gated through the existing Social launch workflow.
- Targeted ESLint, full TypeScript checking, and the production build passed.

### Marketplace follow-up — weekly events and business offers foundation

- Split homepage events into the current Monday–Sunday week and later upcoming events.
- Added a dedicated business-offers schema with ownership, approval, active dates, RLS, payment state, premium rank, and featured rank.
- Added public `/offers`, owner `/my-businesses/offers`, and admin `/studio/businesses/offers` workspaces.
- Featured offers can participate in the homepage hero after admin approval and activation.
- Payment state and reference fields are manual plumbing only; no payment provider or automatic charging is enabled yet.
- The offers migration must be applied before deploying code that queries `business_offers`.

### Sprint 15 follow-up — Standardized newsletter density

- Limited newsletter sections to four featured-first items.
- Standardized story excerpts to a maximum of 105 characters.
- Reduced email thumbnails to a consistent 112×84 layout.
- Matched the Studio Newsletter preview to the compact website treatment with smaller images and two-line descriptions.
- Bumped generated output packages to version 4 so older long-form email packages must be regenerated before sending.

### Sprint 15 follow-up — Corrected Highlights and Videos sources

- Community Highlights now uses only `featured_social_content`, ordered by `display_order` and capped at three records.
- Removed Instagram API posts from Community Highlights.
- Removed featured-community table records from Videos.
- Videos now uses only the YouTube API feed and Instagram API video/reel results.
- Successful discovery refreshes remove stale mixed records while preserving manually edited items.
- Cleanup is skipped when a relevant feed fails, protecting publications during temporary API outages.
- Targeted ESLint, full TypeScript checking, and the production build passed.
### Marketplace follow-up — configurable pricing and approval-first payment

- Added Studio offer-pricing management for standard, premium, featured, and homepage hero tiers.
- Added standalone advertiser offers while retaining business-linked offers as the preferred path.
- Added approval → frozen quote → payment link → payment confirmation → activation workflow.
- Added owner-facing current prices and payment-link handoff.
- Payment-provider automation remains a follow-up; Studio supports manual secure checkout links and confirmation now.
### Sponsor onboarding agreement content

- Added legally reviewable master sponsorship agreement copy with editable placeholders.
- Added Platinum, Gold, Silver, and intentionally blank Bronze package schedules.
- Added flexible Zelle installment schedule language and payment-proof verification terms.

### Sponsor onboarding workflow

- Added configurable Platinum, Gold, Silver, and Bronze package templates and pricing.
- Added a Studio agreement builder with optional business linking, editable contract text, admin discount finalization, flexible installment amounts/dates, and activation rules.
- Added secure emailed review links, electronic acceptance audit fields, decline handling, and immutable-on-send content hashing.
- Added sponsor-facing Zelle instructions and payment-confirmation upload per installment.
- Added admin-triggered email reminders for individual incomplete installments.
- Added Studio payment verification and automatic homepage contributor activation after acceptance, first payment, or full payment according to the agreement.
- The migration `20260804150000_add_sponsor_onboarding.sql` must be applied before testing this workflow.

### Sponsor portal and marketplace entitlements

- Added My Sponsorships to My Hub for agreement text, signer details, benefits, dates, installments, and confirmation uploads.
- Admins can inspect the exact signed agreement snapshot; only unsigned drafts remain editable.
- Sponsorship activation automatically creates the homepage contributor and enables premium placement for the linked business.
- Offer approval checks active sponsorship entitlements: Bronze includes Premium, Silver includes Premium and Featured, and Gold/Platinum include Premium, Featured, and Homepage Hero.
- Included placements remain approval-first but bypass payment with an auditable sponsorship waiver.
- Apply `20260804170000_integrate_sponsor_portal_entitlements.sql` after the base sponsor onboarding migration.
- Added admin offer creation for approved directory businesses and independent one-off advertisers; new records enter the same approval, entitlement, and payment workflow.

## Directory ownership expansion — Events, Influencers, and Groups

### Studio-created influencer listings

- Added a complete Studio form for administrators to create pending or immediately approved influencer directory profiles.
- Studio-created profiles are visibly marked unclaimed and remain compatible with the existing claim, correction, and removal workflow.
- Added service/repository/hook layering for influencer Studio management and validation for contact email and social channels.
- Added an Add Classified shortcut in Studio that reuses the existing moderated classified submission workflow.
- Database migration required: `20260811003000_allow_admin_influencer_creation.sql`.

### Studio-created groups and organizations

- Added responsive Add Group and Add Organization forms directly to their Studio management pages.
- Administrators may create a pending record or approve and publish it immediately.
- Created records retain the existing public, claim, correction, organization-verification, and moderation workflows.
- Added shared hook/service/repository validation without replacing the established management tools.
- Database migration required: `20260811013000_allow_admin_community_creation.sql`.

- Added a shared claim, correction, and removal request flow for public events, influencer profiles, and community groups.
- Added user request history and a Studio moderation queue.
- Approved claims create verified manager access and connect the existing listing to the approved user.
- Approved removals hide listings; they do not permanently delete records.
- Added guarded RLS policies, review indexes, and duplicate open-request protection.
- Production build and TypeScript validation pass. The migration must be applied before live testing.

## Community Classifieds — Initial end-to-end release

- Added public classified browsing, search, category filtering, detail pages, image galleries, advertiser contact choices, and reporting.
- Added authenticated submission with configurable placement pricing, up to five images, moderation, payment states, and expiration dates.
- Added My Classifieds for status tracking, approval amounts, payment handoff, and sold/filled closure.
- Added Studio moderation and configurable Standard, Featured, and Homepage pricing/durations.
- Added RLS, transactional review, activity history, report moderation plumbing, and safe non-destructive status transitions.
- Swirepay checkout creation and captured-payment activation remain intentionally server-side follow-up work pending the confirmed provider API/header/payload contract.

## Swirepay verified webhook capture

- Added `POST /api/webhooks/swirepay` with raw-body HMAC-SHA256 verification using the Base64 `x-swirepay-signature` header.
- Added constant-time comparison, duplicate-delivery protection, server-only secrets, and capture-only persistence.
- Added a restricted Studio payload inspector at System → Swirepay Webhooks.
- No payment or listing activation occurs yet. The first verified test Captured payload must be reviewed and mapped before processing is enabled.

### Swirepay authorized-payload mapping and redaction

- Verified the first live-shaped test webhook and mapped its top-level payment-session `gid`.
- Normalized `REQUIRE_CAPTURE` as `payment.authorized`; the observed payload had zero paid and received amounts and is not treated as captured.
- Added pre-persistence redaction for customer, card/payment-method, receipt, client-secret, authorization, and redirect fields.
- Added a migration that maps and redacts already captured diagnostic rows.
- Automatic offer, classified, and sponsorship fulfillment remains disabled until a true `CAPTURED`, `SUCCESS`, or `SUCCEEDED` payload is received and verified.

### Swirepay succeeded-payment fulfillment

- Verified a signed `SUCCEEDED` test payload with matching amount, paid amount, received amount, USD currency, zero uncaptured amount, payment-session ID, and payment-link ID.
- Added automatic payment-link ID extraction when Studio stores a Swirepay checkout URL.
- Added an idempotent fulfillment ledger and transactional activation for approved-pending-payment business offers and classifieds.
- Fulfillment requires a unique payment-link match, exact frozen quote, exact paid/received amounts, USD, and `SUCCEEDED`; unmatched or ambiguous payments remain inactive for Studio review.
- Classified activation applies the configured placement duration. Business-offer activation preserves the placement flags established during editorial approval.
- Sponsorship and Zelle proof workflows are unchanged.

### Embedded Swirepay checkout pilot for classifieds

- Added an SDTV-branded classified payment page that opens Swirepay's secure card modal without navigating customers away from SDTV.
- Added authenticated, owner-bound, 24-hour payment intents with a frozen approved amount and non-guessable public reference.
- Replaced the primary My Classifieds payment action with `Pay securely on SDTV`; existing provider links remain available as a fallback.
- Browser callbacks cannot activate a classified. The signed `SUCCEEDED` webhook must match the intent, owner, target state, USD amount, paid amount, and received amount before transactional activation.
- Added pending, verification, provider-error, expiration, and confirmed-payment states.
- Requires `20260810153000_add_embedded_classified_checkout.sql`, `SWIREPAY_PUBLIC_KEY`, and the provider-supplied `SWIREPAY_CHECKOUT_URL`. Keep `SWIREPAY_MODE=test` until the complete pilot passes.
- Confirmed that the provider component opens an in-page secure modal and does not navigate customers away from SDTV.
- Prefills available classified contact name, email, and phone directly into the provider-owned checkout component.
- Retained secret-safe checkout diagnostics behind the server-only `SWIREPAY_CHECKOUT_DEBUG=true` troubleshooting flag; they are hidden from ordinary customers.
## Radio schedule management and public API

- Added Studio management for one-time broadcasts, daily programming, and selected-weekday recurring programs.
- Added program title, description, host, Pacific-time timing, optional effective dates, public visibility, editing, and deletion.
- Added a responsive public Radio Schedule section with future-only dated shows, active recurring programming, and a coming-soon empty state.
- Added `GET /api/radio/schedule`, a public read-only CORS endpoint for mobile/application consumers.
- Database migration required: `20260810210000_add_radio_program_schedule.sql`.
- Added Draft, Published, On Hold, and Archived workflow statuses; only Published programs appear publicly.
- Added the supplied weekday, Saturday, and Sunday programming as idempotent seed data, including overnight Night Lounge blocks. Additional migration required: `20260810223000_add_radio_program_status_and_seed_schedule.sql`.

## Public mobile directory API

- Added versioned, read-only endpoints for approved events, businesses, organizations, community groups, and public influencer profiles.
- Added a discoverable `GET /api/mobile/v1` endpoint plus bounded `limit` and `offset` pagination.
- Responses contain public presentation fields only, apply influencer privacy opt-outs, support cross-origin mobile clients, and cache for five minutes.
- No migration or API credential is required; existing public RLS remains the database security boundary.

## Daily registration and role-request digest

- Added a daily email to `seattledesitv@gmail.com` summarizing registrations, volunteer requests, team-member requests, events, businesses, organizations, groups, influencers, classifieds, matrimony profiles/access requests, and business offers from the previous 24 hours.
- Added per-module status summaries and direct Studio review links while excluding sensitive matrimonial, contact, and payment details.
- Added a protected Vercel cron route, server-side Supabase collection, professional HTML summary, Studio review link, and retry-safe Resend idempotency.
- Scheduled the report for `16:00 UTC` daily, approximately 8:00 AM Pacific with a one-hour daylight-saving shift.
- Required Vercel variables: `CRON_SECRET`, `RESEND_API_KEY`, and a server Supabase key. `RESEND_FROM_EMAIL`, `ADMIN_DIGEST_EMAIL`, and `NEXT_PUBLIC_SITE_URL` are optional overrides.
- The delivery archive requires a database migration.
- Added Communications → Daily Digest Archive with metadata-only delivery history, failure visibility, aggregate totals, and an admin-only test-send action.
- Apply `20260812120000_add_admin_digest_archive.sql` before scheduled or test delivery; the archive is intentionally required so emails cannot be sent without an audit record.
- Added an admin-only live activity viewer with inclusive From/To date selection, per-module results, status details, and direct Studio links. Reports query source tables on demand and are not stored.

## Matrimony — Initial moderated release

- Added authenticated profile submission with consent, private image upload, draft/update handling, and admin approval, changes-requested, hold, reject, and archive states.
- Added restricted profile browsing that requires a reviewed, paid, active, unexpired entitlement.
- Separated private contact details from directory profile data; approved viewers cannot read direct contact information.
- Added access-purpose requests, configurable pricing, individual quote overrides, payment handoff, manual verified-payment activation, expiration, renewal, rejection, and revocation.
- Added Community navigation, public entry page, Studio management, sitemap coverage, legal disclosures, and database backup/import coverage.
- Database migration required: `20260810233000_add_matrimony_module.sql`.
- Swirepay automation remains provider-neutral while SDTV waits for the confirmed embedded checkout/API configuration.

## Community Press Releases — Initial moderated release

- Added a public Community press-release directory using the platform's established card language, plus responsive release detail pages optimized for long-form reading.
- Added an authenticated submission workflow with title, summary, full release text, organization/byline details, release date, source link, and up to twelve images.
- Added My Press Releases for submitters to track pending, changes-requested, approved, rejected, and archived records.
- Added Studio creation and moderation with immediate publishing for administrators, approval, requested changes, rejection, archival, and reviewer notes.
- Added public, owner, and administrator RLS policies plus a transactional moderation function and review indexes.
- Added Community, footer, My Hub, Studio, and sitemap navigation.
- Database migration required: `20260814133000_add_community_press_releases.sql`.
- Added up to six PDF, DOC, or DOCX attachments per release with upload validation, Studio inspection, inline PDF viewing, Word web preview, and original-file download. Additional migration required: `20260814143000_add_press_release_documents.sql`.
- Added administrator-controlled Instagram publishing for approved releases, including image selection, an editable caption, and explicit final confirmation.
- Saved successful Instagram media identifiers and permalinks and exposed “View on Instagram” links on public release cards and detail pages. Additional migration required: `20260824120000_add_press_release_instagram_publication.sql`.

## Technical SEO and AI discoverability foundation

- Added consistent metadata and canonical URLs across the major public landing pages.
- Added live, record-specific metadata and social sharing cards for events, classifieds, community organizations, press releases, and publications.
- Added server-rendered schema.org structured data for the site, nonprofit organization, events, organizations, classified offers, press releases, and publications.
- Expanded the sitemap with public landing pages and live public records using authoritative update dates.
- Hardened crawler boundaries for Studio, account, payment, API, owner-workspace, and diagnostic routes, including response-header `noindex` protection.
- Added `/llms.txt` as supplemental machine-readable site and attribution guidance.
- Removed the global homepage canonical that could incorrectly identify unrelated pages as duplicates of the homepage.
- No database migration or new dependency is required.
- Focused lint, TypeScript validation, and the complete Next.js production build pass.

## Event Operations image upload

- Added multi-image upload to the Event Operations editor so administrators can supply a missing flyer before approval.
- Reused the existing Cloudinary `seattle-desi-tv/events` folder and public upload configuration.
- Added service validation for image files, a 5 MB per-file limit, and a maximum of ten event images.
- Uploaded images remain an editable preview until the administrator saves the event; the first image remains the primary public image.
- Existing image URL entry and removal remain available as fallbacks.
- No database migration or new dependency is required.

## Public newsletter subscription page

- Added `/subscribe` as a dedicated, responsive public signup experience.
- Reused the existing newsletter form, subscribe API, subscriber table, validation, source tracking, and unsubscribe workflow.
- Added footer entry points plus sitemap and machine-readable discovery coverage.
- No database migration or new dependency is required.
