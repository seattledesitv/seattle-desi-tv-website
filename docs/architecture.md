# SDTV Platform Architecture

## System shape

The SDTV application is a Next.js App Router platform with React client and server modules, Supabase persistence and authentication, and a shared Studio administration experience.

Application features follow this dependency direction:

```text
React Components → React Hooks → Services → Repositories → Supabase
```

Components may import domain types, but data operations must pass through hooks and services. Services own business rules and coordinate repositories. Repositories are the only publishing-domain modules that issue Supabase table operations.

## Publishing Platform

Publishing is implemented under `app/lib/publishing`, `app/hooks`, `app/components/publishing`, and `app/studio/publishing`.

### Domain and persistence

- `app/lib/publishing/types.ts` defines publication-level domain types.
- `app/lib/publishing/repository.ts` persists publication records.
- `app/lib/publishing/repositories/sectionRepository.ts` persists publication sections.
- `app/lib/publishing/repositories/publicationItemRepository.ts` persists publication items.
- `app/lib/publishing/repositories/contentRepository.ts` persists discovery snapshots.
- Versioned schema changes live under `supabase/migrations`.

### Services

- `sectionService.ts` initializes and updates publication sections.
- `publicationItemService.ts` validates item edits and performs inclusion, featured, ordering, and deletion operations.
- `discoveryService.ts` coordinates approved source-content discovery.
- `publicationWorkspaceService.ts` authorizes and opens editorial workspaces without exposing repository or authentication details to UI components.

### Hooks and UI

- `usePublicationSections.ts` owns section-editor state and autosave.
- `usePublicationItems.ts` owns item loading, optimistic mutations, two-second autosave, retry, refresh, deletion, inclusion, featuring, and ordering.
- `app/components/publishing/items` contains reusable item cards, editor controls, toolbar, badges, preview, and workspace composition.
- `/studio/publishing/[publicationId]/items` is the responsive editorial workspace.
- `/studio/publishing/[publicationId]` is the unified editor shell. It composes section editing, item editing, content discovery, and live preview without duplicating their underlying hooks or services.

### Unified editor behavior

The publication library remains a dashboard. Its primary `Open Editor` action opens a workflow-oriented editor with four stages: Build, Preview, Approve, and Publish. Each stage exposes only its relevant tools while preserving the underlying editor modes and URLs.

The section rail owns section selection and ordering only during Section, Items, and AI editing. Discovery and downstream workflow stages use the full workspace width because they operate on the publication rather than one selected section. Stage navigation scrolls horizontally on small screens, and contextual sub-navigation avoids presenting every tool at the same visual priority.

Custom text sections use the existing `publication_sections` table with `custom_` section keys and `custom_text` type. Built-in sections may be excluded but not deleted; custom sections may be deleted through the section service. Database cascade rules remove their child publication items.

### AI content engine

The unified editor calls `publicationAiService.ts`, which sends the authenticated session to the admin-only generation API. Provider keys remain server-side. The API uses Gemini when configured and otherwise OpenAI, loads active versioned prompts from Supabase, and records every successful or failed request with its input snapshot, output, source attribution, provider, and model.

AI output is always presented as a suggestion. Editors must explicitly apply it, after which existing section or item autosave persists the chosen fields. Manual content is included in generation context so the model can respect editorial intent; unattended background generation never overwrites manual edits.

### Preview and export engine

`previewService.ts` builds one canonical preview model from included sections and included items. Website, newsletter, Instagram, Facebook, LinkedIn, mobile, and print renderers consume that model so channel output cannot drift from editorial state.

The preview workspace supports JSON and standalone HTML downloads. PDF export uses a dedicated print stylesheet and the browser's native Save as PDF workflow, preserving selectable text and avoiding a client-side PDF dependency. Print rules isolate the publication renderer, set letter-size margins, and discourage page breaks inside section items.

### Publishing pipeline

The unified editor's Publish mode prepares immutable channel output snapshots from the canonical preview model. Campaigns group output records; each output independently tracks status, schedule, attempts, errors, and timestamps. `publication_publish_attempts` provides an append-only audit trail for generation, scheduling, publishing confirmation, retry, and cancellation.

Channel-specific delivery is isolated behind `app/lib/publishing/adapters/registry.ts`. All adapters default to manual handoff until their external credentials, API behavior, and failure semantics are explicitly implemented and tested. The UI requires confirmation before a handoff, preventing development code from posting externally.

`channelOutputService.ts` converts the canonical preview model into versioned channel packages. Website, PDF, newsletter, and email packages contain self-contained responsive HTML; Instagram, Facebook, and LinkedIn packages contain bounded captions, hashtags, text, links, and media references. Each database output stores its own immutable payload so a later editorial change cannot alter an already prepared handoff.

The pipeline workspace can download HTML or text handoff files and copy channel text. Legacy generic snapshots remain readable in history but are explicitly identified and must be regenerated before download. Provider adapters remain a separate concern and consume these packages only after credentials and channel-specific delivery rules are approved.

Email is the first automatic delivery adapter. Its admin-only server route requires a successful test for the same output within 24 hours before subscriber delivery. It selects only active subscribers, sends personalized messages in provider-supported batches, includes subscription-management links, and writes a per-recipient delivery ledger. Successfully delivered addresses are skipped on retry, preventing duplicate campaign email after a partial failure.

### Weekly Events Instagram composer

The unified editor's Events → Instagram mode consumes the canonical publication preview rather than querying events or Supabase from the UI. It selects the included items from the Events section, then the hook manages local selection, ordering, editable copy, generation, upload, and status.

`weeklyEventsInstagramService.ts` is responsible for the 4:5 branded canvas layout and final caption assembly. Generated PNG files remain local for review and download until the editor explicitly uploads them through the existing Cloudinary helper. `instagramPublishingService.ts` handles the authenticated UI-to-API boundary.

The existing admin-only Instagram endpoint accepts either one image or a carousel. Carousel publishing creates and verifies each child image container, creates the parent container, waits for processing, and publishes only after explicit confirmation in the workspace. The API enforces Instagram's ten-image carousel limit. No background action or ordinary autosave can publish externally.

`weekly_instagram` is a first-class publication type protected by the publications table constraint. It keeps the complete publication architecture but opens the unified editor in the Events → Instagram workspace by default. Final approval stores an in-memory signature of the reviewed Cloudinary URL set; changing or regenerating the images invalidates approval before publishing.

### Public publication delivery

Website output is an internal publishing adapter rather than a manual external handoff. Confirming a Website output marks the canonical publication as published, stores `/publications/{publicationId}` on the output, and records a completed publishing attempt. Existing published-only RLS policies then make the publication, included sections, and included items readable to anonymous visitors.

The public archive and detail routes consume a dedicated public-preview hook and service. They do not reuse the admin-gated editorial workspace service and cannot load drafts. The public detail renderer shares the canonical channel preview component with Studio, preventing visual drift between preview and the public edition.

### Email output compatibility

Newsletter email is the single subscriber-delivery channel. It produces package version 2 with table-based structure, inline typography, spacing, colors, images, and buttons for broad email-client compatibility. The browser preview remains optimized for the website; the email renderer intentionally translates that design into email-safe markup rather than sending browser CSS.

The historical `newsletter` channel remains in stored types so old campaigns remain auditable, but it is not offered for new generation. Existing version-1 packages are marked legacy and must be regenerated before delivery.

Email package version 3 is a deliberately concise digest rather than a complete visual copy of the website. It prioritizes featured items, limits each section to five entries, truncates descriptions at editorially useful boundaries, and links to the canonical public edition for remaining content. Cloudinary delivery transformations provide consistent thumbnail dimensions without modifying source assets.

Email package version 4 standardizes the digest further: every section is limited to four items, story excerpts are capped at 105 characters, thumbnails use a consistent compact 112×84 presentation, and overflow content is directed to the canonical website edition. Studio's Newsletter preview also uses compact images and two-line descriptions so editorial review better reflects the delivered density.

The website channel remains the complete edition but uses denser responsive presentation: a shorter hero, three-column desktop cards, smaller imagery, and bounded descriptions. Mobile retains a single readable column.

The Weekly Events Instagram final-caption override lives in its hook alongside generated copy. The final approval signature combines the complete ordered image URL set and exact caption text, so any post-review caption or media change invalidates approval before the publishing service can run.

### Social publication launch studio

The unified editor's Social launch mode generates dedicated 1080×1350 Instagram, 1200×630 Facebook, and 1200×627 LinkedIn artwork from the canonical publication cover. Captions are independently editable and include the canonical `/publications/{publicationId}` URL.

Instagram launch artwork uses an editorial publication mockup rather than a generic cover card. The canvas renderer places the real cover, edition identity, publication title, and up to four included section teasers inside a clean browser-style newsletter frame. This gives social audiences a visual preview of the publication while keeping the output generated entirely from the canonical preview model.

Generated files stay local until an editor uploads them through the existing Cloudinary helper. Approval signs the exact uploaded URL and caption for each channel; regenerating the artwork or editing the caption invalidates that approval. Direct publishing also requires the publication to be Published so announcements cannot link to an inaccessible edition.

Provider routes repeat authentication, Studio-admin authorization, publication-status, media-URL, and caption validation. Instagram reuses the existing Graph publishing endpoint. Facebook publishes a Page photo using `FACEBOOK_PAGE_ID` and `FACEBOOK_PAGE_ACCESS_TOKEN`. LinkedIn uses its Images and Posts APIs with `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN`, and an explicitly configured supported `LINKEDIN_API_VERSION`. Provider credentials remain server-side.

### Editorial review and release governance

Publication lifecycle changes use the `transition_publication_status` database function. The function runs with the caller's permissions, verifies Studio admin membership, locks the publication row, validates the requested transition, updates the canonical status, and appends `publication_status_history` in one transaction. Components never write status fields directly.

`usePublicationWorkflow` owns review state and history. `publicationWorkflowService.ts` defines the allowed transition graph and approval-note requirements, while `publicationWorkflowRepository.ts` contains status-history reads and the transition RPC call.

Delivery requires a publication status of Approved, Scheduled, or Published. The publishing service enforces this for website and manual channel handoffs; subscriber email and publication-based Instagram routes repeat the check server-side. Email tests and output generation remain available before approval so editors can complete quality assurance without authorizing release.

Website publishing transitions an approved publication to Published through the same audited workflow. Returning a published publication to Draft removes it from anonymous access through the existing published-only RLS policies and requires a new review and approval before another release.

### Homepage content bridge

Publication discovery reuses the public homepage's source tables to create a complete editorial starting point. Repository helpers load source rows and live counts; discovery services normalize them into publication items for Cover, Highlights, Events, Businesses, Organizations, Groups, Recognition, Videos, Statistics, and Get Involved.

Community Highlights and Videos have intentionally separate ownership. Community Highlights contains at most the first three active, featured rows from `featured_social_content`, ordered by homepage display order. Videos contains only live YouTube API results and Instagram API results whose media type is video. Neither source is allowed to populate the other section.

When a clean Highlights/Video refresh succeeds, the discovery repository removes stale, non-manually-edited items no longer returned by the correct sources before upserting the new snapshot. Manually edited items are preserved, and cleanup is skipped for a source type if any of its feeds failed so temporary API outages cannot erase content.

YouTube and Instagram discovery uses the platform's existing server API routes through `socialFeedRepository.ts`, keeping provider credentials server-side and avoiding duplicate provider integrations. If either feed is unavailable, discovery returns the other sources and reports a non-blocking warning.

Cover candidates include active homepage banners, featured events, and scheduled festival heroes. The preview uses the featured cover item as its image hero when a publication-level cover image is not set. Statistics are captured as editable item snapshots so published output remains auditable while a fresh discovery can pull current totals. Get Involved actions mirror the homepage destinations and remain editable in the item workspace.

Print output uses a dedicated letter-size stylesheet with a full cover page, exact background-color printing, controlled card fragmentation, two-column editorial grids, and a compact Get Involved block. Standalone HTML exports include a production base URL so internal calls to action remain functional when the downloaded file is opened locally.

### Editorial save behavior

Manual item fields are saved after a two-second debounce. The hook merges rapid field changes, prevents stale retries from overwriting newer edits, refreshes canonical records after successful saves, and retains still-pending optimistic changes. Immediate actions optimistically update the UI and roll back on failure.

Ordering supports drag-and-drop and explicit move controls. The service persists the complete ordered ID list through the item repository.

## Browser Supabase clients

## Business offers

Business offers are separate, time-bound records linked to `local_businesses`, allowing a business to run multiple promotions without overwriting its directory profile. UI pages use `useBusinessOffers`, which delegates validation and placement behavior to `BusinessOfferService`, while `businessOfferRepository` owns Supabase access.

Owners and approved managers can submit offers for review. Public reads require approved, currently active records. Premium and featured placement plus payment status are admin-controlled through RLS. The payment fields form a provider-neutral boundary for a future checkout/webhook integration; they do not currently initiate a charge.

Featured approved offers are eligible for the homepage hero, while premium and featured ranks control ordering on the offers page.

Client pages use `app/lib/supabaseBrowser.ts`. The helper provides one configured browser client and a non-persistent placeholder during server prerender when public environment variables are unavailable. This keeps client pages buildable without weakening runtime configuration requirements.

Direct module-level `createClient` calls in browser pages should not be introduced.

## Build and tooling

- Next.js 16 uses ESLint directly through `eslint.config.mjs`; `next lint` is no longer supported.
- TypeScript targets ES2017 to support the platform’s existing iterator usage and the current compiler.
- `package-lock.json` pins the dependency graph for reproducible local and Vercel builds.
- A production build must complete compilation, type checking, page-data collection, and static generation before release consideration.

## Architectural decisions

1. Publishing snapshots remain independent of their source records so editorial changes do not mutate source modules.
2. Manual publication-item edits are recorded in both editable columns and `manual_content`, with `is_manually_edited` preserving editorial intent.
3. AI generation must merge with manual edits instead of overwriting them.
4. Multi-channel preview and publishing must consume the same canonical publication and item services rather than build channel-specific data silos.
### Business offer pricing and payment workflow

Offer placement pricing is stored in `business_offer_pricing` and managed through Studio. Submission does not activate an offer: editorial approval snapshots the current tier price onto the offer, paid tiers enter `approved_pending_payment`, and activation occurs only after payment confirmation. Payment links are provider-neutral so Stripe or another checkout adapter can be connected without changing the offer domain model. Offers normally reference `local_businesses`, while authenticated users and administrators may submit accountable standalone offers using advertiser identity fields.

### Swirepay webhook normalization

Swirepay may deliver a payment-session entity directly rather than an event envelope. The webhook payload service maps the top-level payment `gid`, normalizes `REQUIRE_CAPTURE` as `payment.authorized`, and reserves `payment.captured` for provider statuses such as `CAPTURED`, `SUCCESS`, or `SUCCEEDED`. Authorized events never activate paid features. Raw-body signature verification and hashing occur before mapping, while customer, card, receipt, client-secret, and authorization fields are removed before persistence.

Succeeded payment fulfillment uses the unique `paymentlink-*` identifier extracted from the admin-approved checkout URL. A database function locks the candidate, requires a frozen-quote match, exact paid and received amounts, USD currency, and an approved-pending-payment state, then writes an idempotent fulfillment ledger and activates the target in one transaction. A payment link or session can fulfill only once. Unmatched or ambiguous payments remain visible in Studio and do not activate content.

Classifieds also support an embedded-checkout pilot. The owner requests a server-created, 24-hour payment intent tied to the exact classified, owner, approved state, and frozen quote. The SDTV payment page loads Swirepay's provider-hosted Web Component as a modal, so raw card data never reaches React, Next.js, or Supabase. The intent token is carried in the provider description; the browser callback is informational only. Activation still requires a signature-verified `SUCCEEDED` webhook whose amount, paid amount, received amount, currency, intent, owner, and classified state all match inside one database transaction.

Embedded checkout configuration is server-read and returned only to an authenticated intent owner: `SWIREPAY_PUBLIC_KEY` (or `NEXT_PUBLIC_SWIREPAY_PUBLIC_KEY`), `SWIREPAY_CHECKOUT_URL`, and `SWIREPAY_MODE`. Test is the safe default unless mode is explicitly `live` (or legacy `SWIREPAY_TEST_MODE=false`). The public key and component URL are intentionally non-secret; provider secret keys remain server-only and are not used by browser checkout. Customer contact details already attached to the classified are passed directly to the provider component for prefilling. Secret-safe browser diagnostics are hidden from customers unless the server-only `SWIREPAY_CHECKOUT_DEBUG=true` setting is enabled for troubleshooting. Debug output identifies the selected environment-variable source, test/live key classification, normalized key length, and a one-way SHA-256 fingerprint without disclosing the key itself. While debug mode is active, failed Fetch/XHR calls to Swirepay hosts record only the endpoint path, HTTP status, and allowlisted provider error fields; request bodies, headers, card details, keys, and tokens are never captured.

### Sponsor onboarding

Sponsor packages are reusable configuration, while each `sponsorship_agreements` row is a dated and priced snapshot. Studio uses `useSponsorships` through the sponsorship service and repository layers. Secure send, acceptance, payment-proof, and verification operations use server routes because they require email delivery, service-role access, and audit logging.

Raw agreement access tokens are emailed but never stored; only SHA-256 hashes are persisted. Public token reads return a restricted agreement view and cannot expose internal notes or administrative fields. Acceptance records signer name, title, timestamp, IP, and user agent. Installment verification is intentionally separate from proof submission, and activation creates a homepage contributor only when the agreement's activation condition is satisfied.

Authenticated sponsors can also read agreements through My Sponsorships when their login email matches the agreement or they actively manage its linked business. Signed agreement text is immutable; Studio may edit draft text but presents the accepted snapshot read-only afterward.

Active sponsorships provide marketplace entitlements without bypassing editorial approval. Offer approval resolves the linked business's current active agreement, checks the requested placement against the tier matrix, and snapshots both the agreement ID and waiver tier onto the offer. Sponsorship activation also updates the linked business's premium directory dates so public placement expires with the agreement.

## Public listing ownership and accuracy

Events, influencer profiles, and community groups share a moderated listing-management workflow. Public components link to a single request experience, the React hook owns request state, the service validates and coordinates decisions, and the repository performs Supabase access. `listing_management_requests` stores claim, correction, and removal requests. `listing_managers` records verified access without creating separate claim implementations for every directory.

Claims never grant access at submission time. An administrator must approve them in Studio; approval records verified manager access and connects the listing to the approved user so existing owner tools continue to work. Removal requests also require approval and hide the record instead of deleting it. Correction requests are applied by an administrator in the existing editor and require a confirmation note before being marked approved.

Studio administrators may create unclaimed influencer directory records through the influencer service and repository. These records use the same public directory, moderation states, and shared listing-management claim workflow as influencer self-submissions. Admin creation does not silently assign ownership; an approved claim connects `user_id` only after verification.

Community groups and organizations use a shared Studio creation form backed by a hook, service, and repository. Administrators may create pending records or approved public records. Studio creation records the administrator as the submitter for audit purposes but does not establish external ownership; group claims use the shared listing workflow and organization representatives continue through the organization-management verification workflow.

## Community Classifieds

Classifieds are separate from business offers because they represent community person-to-person listings with distinct safety, expiration, reporting, and privacy requirements. The module follows Components → Hooks → Services → Repositories → Supabase. Listings are approval-first, time-bound, and publicly readable only while active. Standard, featured, and homepage placement pricing is configurable. Free approvals activate immediately; paid approvals wait for a server-confirmed payment workflow. Reports and moderation actions remain auditable, and removal uses status changes rather than destructive deletion.

## Swirepay webhook verification

Swirepay webhooks enter through a server-only endpoint that reads the exact raw body before JSON parsing. The endpoint verifies the Base64 `x-swirepay-signature` using HMAC-SHA256 and `SWIREPAY_WEBHOOK_SECRET`, compares signatures in constant time, and rejects unverified deliveries. Verified events are deduplicated by provider event ID when available and otherwise by a SHA-256 body hash. The initial implementation is capture-only: it stores verified payloads for restricted Studio inspection but cannot activate an offer or classified until captured-event fields are mapped and tested.
## Radio schedule

Radio programming follows the standard Components → Hooks → Services → Repositories → Supabase layering. `radio_programs` stores either a dated `one_time` broadcast or a `daily`/`weekly` recurring program using Pacific-time schedule fields. Public reads expose only published, non-expired dated shows and currently effective recurring programs. Studio admins manage the schedule at `/studio/radio-schedule`; the public radio page consumes the same service.

Programs use an editorial status of `draft`, `published`, `on_hold`, or `archived`. Only `published` records cross the public RLS boundary. Overnight recurring programs are represented by an end time earlier than the start time, such as 10 PM–6 AM.

`GET /api/radio/schedule` is the read-only, CORS-enabled integration contract for SDTV applications. It returns `{ generatedAt, timezone, upcoming, recurring }`, is cached for five minutes at the edge, and never exposes unpublished programs.

## Public mobile directory API

The versioned, read-only mobile contract is rooted at `GET /api/mobile/v1`. Separate resource endpoints expose approved events, businesses, organizations, community groups, and public influencer profiles. API routes delegate filtering and response normalization through `PublicDirectoryService` and its repository, preserving the platform service/repository boundary.

The endpoints use the Supabase anonymous client and existing RLS rather than a service-role credential. Responses exclude contact details, submitter/owner identity, internal workflow fields, payment data, claim records, and unpublished rows. Influencer visibility opt-outs are also enforced. Public CORS, bounded `limit`/`offset` pagination, and five-minute edge caching support mobile clients without permitting writes.

## Registered user administration

Studio User Control distinguishes real Supabase Authentication accounts from the broader set of platform people assembled from profiles, contributors, submissions, and connected modules. The browser hook calls an authenticated Studio API; the API verifies the caller's administrator role before a server-only repository uses the Supabase service credential to list or delete Authentication users. The service credential is never sent to the browser.

Account deletion requires the administrator to type the target email address, blocks self-deletion, and restricts deletion of administrator accounts to super administrators. It uses Supabase soft deletion to remove and anonymize the Authentication identity while preserving linked platform records. Deleted identities are excluded from Studio counts and listings.

## Daily administrator activity digest

Vercel invokes `GET /api/cron/daily-admin-digest` once daily. The secured route requires Vercel's `CRON_SECRET`, uses the server-only Supabase service credential to read new Authentication users, new `volunteer`/`team_member` role requests, and new submissions from the prior 24 hours, and delegates collection and rendering to the admin-digest repository and service. Submission sections cover events, businesses, organizations, community groups, influencers, classifieds, matrimony profiles, matrimony access requests, and business offers.

The digest is delivered through the existing Resend integration to `ADMIN_DIGEST_EMAIL` (defaulting to `seattledesitv@gmail.com`). It includes review statuses and Studio links but excludes private profile details, contact data, request reasons, and payment information. A date-scoped Resend idempotency key prevents duplicate delivery when the same day's invocation is retried. The endpoint never exposes digest content in its response and cannot be triggered without the cron secret.

Delivery metadata is archived in `admin_digest_deliveries`. The archive records the reporting window, recipient, subject, aggregate counts, delivery type/status, provider identifier, trigger identity, and failure message without retaining rendered email bodies. Admins access it through Communications → Daily Digest Archive and may send an independently identified test digest through an authenticated server route.

The same Studio area provides an on-demand activity report for an administrator-selected inclusive date range. Its authenticated server route queries the authoritative Authentication and platform tables at request time, returns the same privacy-limited sections used by the digest, sets `private, no-store`, and limits requests to 366 days. Report results are not persisted.

## Matrimony

The matrimony module follows Components → Hooks → Services → Repositories → Supabase. Profiles and viewer access are separate approval workflows. A profile can be submitted without buying directory access, and buying access never publishes a profile.

`matrimony_profiles` stores approved-view information. Direct contact details are separated into `matrimony_profile_contacts`, whose RLS limits reads to the profile owner and administrators. Profile photos use the private `matrimony-profile-images` bucket; signed URLs are available only to owners, administrators, and users with active unexpired access. Approved viewers can read only approved profiles and never receive the contact table.

`matrimony_access_requests` records the stated purpose, editorial decision, frozen quote, payment state, and time-limited entitlement. Pricing is configurable through `matrimony_access_pricing`. Activation is approval-first and payment-second. The payment boundary is provider-neutral until the Swirepay embedded-checkout contract is confirmed; administrators may provide a secure payment URL and record a verified payment reference without changing the domain model.

## Community press releases

Press releases follow the standard Components → Hooks → Services → Repositories → Supabase boundary. Authenticated community members submit announcements into an approval queue, while Studio administrators can either queue an SDTV-authored release or publish it immediately. Only approved releases cross the public RLS boundary.

Each release stores its editorial text and an ordered set of up to twelve image URLs. The first URL is the primary directory-card image; saved display mode, focal position, and zoom fields provide the same non-destructive card-image framing used by the business directory. Images reuse the established `event-posters` storage bucket under a dedicated `press-releases/{userId}` prefix. The public detail experience keeps long-form text primary and presents the gallery separately so a selected image can expand without obscuring or replacing the release body.

Releases may also carry up to six structured PDF or Word attachments, limited to 20 MB each by the service. PDFs use the browser's inline viewer. Public Word documents use Microsoft Office's web viewer with an original-file fallback because browsers do not natively render DOC/DOCX consistently. Attachment metadata is stored separately from images so existing releases remain backward compatible.

Moderation uses the `review_press_release` database function for approve, request-changes, reject, and archive transitions. Owners can see their own non-public submissions without gaining a path to self-approve. Administrative reads and writes remain protected by the existing `is_admin()` authorization pattern.

Submitters can edit any non-archived release they own. Owner changes always reset the release to `pending`, including edits to an approved release, so changed content cannot bypass moderation. Studio administrators can edit any release without changing its current workflow status, then use the explicit moderation controls independently.

Approved releases expose a Studio-only Instagram publishing panel. The component manages image selection, caption editing, preview, and explicit final approval; a press-release service builds the default caption and invokes the shared Instagram publishing service. The protected Instagram API independently verifies both the administrator session and the release's approved status before sending up to ten public HTTPS images to Meta. No UI component receives or handles Instagram credentials.

After Meta confirms publication, the API records the returned media identifier, permalink, timestamp, and publishing administrator on the press release. Public cards and detail pages expose the saved Instagram link. Recording is deliberately non-transactional with the external publish: if Meta succeeds but the database update fails, the API reports a warning instead of inviting an accidental duplicate post.

## Finance management

Finance records remain restricted to super administrators and private receipt files remain in Cloudflare R2. The Finance editor uses the authenticated server API for both creation and updates. Editing supports expense and mileage fields, recalculates mileage reimbursement server-side, records the updating administrator, and preserves the existing receipt unless a validated replacement is explicitly uploaded.

## Search and AI discoverability

Public discovery follows a server-rendered SEO boundary. Route layouts call the SEO service, which obtains public records through a read-only repository using the Supabase anonymous client and existing RLS. Components do not query Supabase. Dynamic event, classified, organization, press-release, and publication pages produce record-specific titles, descriptions, canonical URLs, social cards, and schema.org JSON-LD. Missing or inaccessible records emit `noindex` metadata rather than misleading generic metadata.

The dynamic sitemap combines curated public landing pages with current public entity URLs and their authoritative modification dates. `robots.txt` advertises the production sitemap and excludes Studio, account, payment, API, diagnostic, and owner-workspace routes. Those private surfaces also receive an `X-Robots-Tag: noindex, nofollow, noarchive` response header as defense in depth.

The root layout exposes Organization and WebSite structured data, including Seattle Desi TV's nonprofit identity and official social profiles. `/llms.txt` provides a concise, supplemental map of canonical public sections and attribution guidance for machine readers. It does not replace normal crawling, structured data, content quality, or search-engine indexing controls and does not guarantee inclusion in any AI answer.
