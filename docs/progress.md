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
- Existing server-side social API integrations reused without exposing credentials
- Homepage-style Get Involved preview with four clear action buttons
- Correct public contact routes for Volunteer, Sponsorship, and Event Coverage
- Working Submit Content route
- Letter-size magazine print layout with a dedicated cover page
- Improved print colors, page breaks, item grids, image sizing, and link preservation
- Production base URL added to downloaded HTML so internal links work outside the website

No database migration or npm dependency was required.

Validation:

- Targeted ESLint passed
- Full TypeScript check passed
- Production build passed and generated all 156 routes
- Automated browser/PDF visual inspection was blocked by the local Windows app sandbox; verify Print / Save PDF from the authenticated feature preview with real content before release
