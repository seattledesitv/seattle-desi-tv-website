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

The website channel remains the complete edition but uses denser responsive presentation: a shorter hero, three-column desktop cards, smaller imagery, and bounded descriptions. Mobile retains a single readable column.

The Weekly Events Instagram final-caption override lives in its hook alongside generated copy. The final approval signature combines the complete ordered image URL set and exact caption text, so any post-review caption or media change invalidates approval before the publishing service can run.

### Editorial review and release governance

Publication lifecycle changes use the `transition_publication_status` database function. The function runs with the caller's permissions, verifies Studio admin membership, locks the publication row, validates the requested transition, updates the canonical status, and appends `publication_status_history` in one transaction. Components never write status fields directly.

`usePublicationWorkflow` owns review state and history. `publicationWorkflowService.ts` defines the allowed transition graph and approval-note requirements, while `publicationWorkflowRepository.ts` contains status-history reads and the transition RPC call.

Delivery requires a publication status of Approved, Scheduled, or Published. The publishing service enforces this for website and manual channel handoffs; subscriber email and publication-based Instagram routes repeat the check server-side. Email tests and output generation remain available before approval so editors can complete quality assurance without authorizing release.

Website publishing transitions an approved publication to Published through the same audited workflow. Returning a published publication to Draft removes it from anonymous access through the existing published-only RLS policies and requires a new review and approval before another release.

### Homepage content bridge

Publication discovery reuses the public homepage's source tables to create a complete editorial starting point. Repository helpers load source rows and live counts; discovery services normalize them into publication items for Cover, Highlights, Events, Businesses, Organizations, Groups, Recognition, Videos, Statistics, and Get Involved.

YouTube and Instagram discovery uses the platform's existing server API routes through `socialFeedRepository.ts`, keeping provider credentials server-side and avoiding duplicate provider integrations. If either feed is unavailable, discovery returns the other sources and reports a non-blocking warning.

Cover candidates include active homepage banners, featured events, and scheduled festival heroes. The preview uses the featured cover item as its image hero when a publication-level cover image is not set. Statistics are captured as editable item snapshots so published output remains auditable while a fresh discovery can pull current totals. Get Involved actions mirror the homepage destinations and remain editable in the item workspace.

Print output uses a dedicated letter-size stylesheet with a full cover page, exact background-color printing, controlled card fragmentation, two-column editorial grids, and a compact Get Involved block. Standalone HTML exports include a production base URL so internal calls to action remain functional when the downloaded file is opened locally.

### Editorial save behavior

Manual item fields are saved after a two-second debounce. The hook merges rapid field changes, prevents stale retries from overwriting newer edits, refreshes canonical records after successful saves, and retains still-pending optimistic changes. Immediate actions optimistically update the UI and roll back on failure.

Ordering supports drag-and-drop and explicit move controls. The service persists the complete ordered ID list through the item repository.

## Browser Supabase clients

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
