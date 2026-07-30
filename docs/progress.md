# SDTV Platform Progress

## Current status

- Active branch: `feature/publishing-platform-v2`
- Publishing Platform Sprints 1–4: complete
- Next planned sprint: Sprint 5 — AI Content Engine
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

## Known issues

- Repository-wide lint reports legacy findings outside Sprint 4, primarily explicit `any` usage and newer React lint rules in existing modules. These should be handled as scoped maintenance rather than mixed into publishing sprints.
- A Vercel preview should be verified from the current feature-branch head before any merge.
- Production environment variables remain required for live Supabase operations even though prerender uses a safe placeholder client.

## Sprint 5 recommendation

Implement the AI Content Engine by extending the existing publication services and item manual-content model:

1. Audit existing AI and prompt integrations.
2. Define generation requests and source-attribution types.
3. Add prompt-management persistence only if no suitable schema exists.
4. Implement item regeneration first, preserving manual fields.
5. Extend generation to sections and publications.
6. Add refresh-from-source behavior with explicit editorial merge rules.
7. Add responsive Studio controls, loading/error states, and generation history where supported.
8. Complete lint, type checking, affected tests, production build, documentation, and logical commits.
