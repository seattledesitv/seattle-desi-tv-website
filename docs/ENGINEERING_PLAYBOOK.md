# Seattle Desi TV Platform Engineering Playbook

## Purpose

This document is the authoritative engineering guide for the Seattle Desi TV (SDTV) Platform. Engineers and coding agents should use the repository as the primary source of truth, preserve working systems, and deliver production-quality changes with the judgment expected of a senior engineer.

Work autonomously through the active sprint. Ask for input only when an external dependency, missing credential, genuine product decision, or major architectural ambiguity blocks progress.

## Repository and branch policy

- Repository: `seattledesitv/seattle-desi-tv-website`
- Active development branch: `feature/publishing-platform-v2`
- Never work directly on `main` or `stagingv1`.
- Do not deploy, merge, or squash commits unless explicitly authorized.
- Commit only to the active feature branch.

## Product vision

SDTV is a unified community platform comprising the public website, events, business directory, organizations, community groups, team management, volunteer onboarding, recognition, media production, publishing, newsletters, AI content generation, social publishing, and Admin Studio.

Every feature should feel like part of the same platform and preserve the established user experience.

## Engineering principles

1. Preserve existing functionality and backward compatibility.
2. Understand the repository before changing it.
3. Extend established patterns instead of inventing parallel architectures.
4. Prefer reusable modules and minimal duplication.
5. Keep the codebase production-ready and document important decisions.
6. Do not introduce dependencies unless the repository lacks the needed capability.
7. Do not refactor unrelated code merely to clear pre-existing warnings.

## Repository-first workflow

Before implementation:

1. Search for comparable functionality.
2. Understand the existing architecture and conventions.
3. Reuse existing services, repositories, hooks, utilities, storage helpers, APIs, and components.
4. Extend shared modules when appropriate.
5. Confirm the current branch and working-tree scope.

## Application architecture

Maintain this dependency direction:

```text
React Components
       ↓
React Hooks
       ↓
Services
       ↓
Repositories
       ↓
Supabase
```

- Components render UI and emit user intent. They do not query Supabase or call repositories.
- Hooks own client-side state, loading, optimistic behavior, errors, and save indicators.
- Services contain validation, authorization orchestration, and business logic.
- Repositories contain data-access logic only.
- Supabase remains the persistence layer and source of truth.

Preserve the existing Authentication, Team, Volunteer, Recognition, Events, Business Directory, Organizations, Community Groups, Homepage, Studio, Newsletter, Publishing, and Media Workflow modules.

## UI standards

Reuse established Studio buttons, dialogs, forms, cards, tables, layouts, icons, colors, typography, loading states, empty states, and error patterns. All work must support desktop, tablet, and mobile and maintain accessibility.

Every feature should include appropriate TypeScript typing, error handling, loading and empty states, responsive behavior, optimistic updates, and reusable components.

## Supabase and migrations

For every schema change, add a new versioned file under `supabase/migrations/`. Never rewrite a previous migration.

Migrations should include appropriate tables or alterations, indexes, policies, functions, triggers, and comments. Prefer `IF EXISTS` and `IF NOT EXISTS` where safe.

Before adding schema, review existing tables and relationships, avoid duplicate data, and follow current naming conventions. Synchronize schema changes with application types, repositories, services, validation, and UI, or document the external type-generation procedure.

Every new table requires intentional row-level security for select, insert, update, and delete using existing authorization patterns.

Before adding storage, inspect and reuse existing buckets, upload helpers, naming conventions, folder structures, and URL-generation utilities.

## Dependencies

Do not add an npm package unless existing platform capabilities are insufficient. Document why each new dependency is needed. Keep `package-lock.json` synchronized for reproducible builds.

## Git and validation

- Use small commits that each represent one logical unit of work.
- Never silently stage unrelated changes.
- Before every commit, run lint and TypeScript checking; run affected tests when present.
- Before a release candidate, run the production build.
- Fix failures introduced by the active sprint. Record unrelated legacy findings separately.
- Do not squash sprint history.

## Documentation

Maintain:

- `docs/architecture.md` for system design, patterns, module responsibilities, and decisions.
- `docs/progress.md` for completed work, active sprint, outstanding work, known issues, and the recommended next sprint.

Update both after every completed sprint.

## Publishing Platform roadmap

The Publishing Platform is the content engine for the website, newsletter, Instagram, Facebook, LinkedIn, PDF, and email.

### Sprint 4 — Editorial Workspace

- Publication-item hook
- Item workspace and editor
- Live preview
- Autosave and retry
- Drag-and-drop ordering
- Status indicators
- Responsive layout

### Sprint 5 — AI Content Engine

- Regenerate item, section, and publication
- Merge AI output with manual edits
- Refresh from sources
- Prompt management
- Source attribution

### Sprint 6 — Preview Engine

- Website, newsletter, Instagram, Facebook, LinkedIn, PDF, and mobile previews

### Sprint 7 — Publishing Pipeline

- Publish and schedule
- Retry
- Publishing history
- Status tracking
- Multi-channel publishing

## Sprint completion report

At the end of each sprint report:

- Summary of implemented functionality
- Files added and modified
- SQL migrations and database changes
- Components, hooks, services, and repositories
- Lint, type-check, test, and build results
- Every commit hash
- Known issues
- Recommended next sprint

## Session bootstrap

For future development sessions, use:

> Read `docs/ENGINEERING_PLAYBOOK.md`, `docs/architecture.md`, and `docs/progress.md`. Understand the current repository state, continue the next incomplete sprint, and work autonomously until the sprint is complete. Follow the playbook for architecture, database changes, Git workflow, documentation, and testing.
