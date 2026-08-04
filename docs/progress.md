# SDTV Platform Progress

## Current status

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
