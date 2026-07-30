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
