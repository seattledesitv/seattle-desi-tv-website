# Homepage Modularization Contract

The homepage refactor must preserve the current visual design and behavior.

## Required invariants

- Section order remains controlled by `homepage_settings.display_order`.
- Disabled sections remain hidden.
- Existing section titles, subtitles, links, empty states, counts and mobile behavior remain unchanged.
- Hero content continues to merge active festival items, featured events and active marketing banners.
- Existing hero rotation order remains unchanged.
- Per-item hero themes remain supported.
- The default global hero layout remains `classic`, matching the current presentation.

## Planned modules

- `homeTypes.ts`
- `homeUtils.ts`
- `HomeHeroSection.tsx`
- `HomeStatsSection.tsx`
- `HomeEventsSection.tsx`
- `HomeRadioSection.tsx`
- `HomeVideosSection.tsx`
- `HomeSocialStatsSection.tsx`
- `HomeSponsorsSection.tsx`
- `HomeContactSection.tsx`

The extraction should be performed section-by-section, with no rewrite or simplification of the existing JSX.
