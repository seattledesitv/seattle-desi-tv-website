# SDTV Platform Progress

## Current status

- Active branch: `feature/publishing-platform-v2`
- Publishing Platform Sprints 1–4: complete
- Publishing Platform Sprint 5A: complete
- Publishing Platform Sprint 5B: code complete; migration and provider key required for live use
- Next planned sprint: Sprint 6 — Preview and Export Engine
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

Build the multi-channel preview and export engine inside the unified editor, beginning with complete publication and PDF previews, then website, newsletter, social, and mobile renderers.
