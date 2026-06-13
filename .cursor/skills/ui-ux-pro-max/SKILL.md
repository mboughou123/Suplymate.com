---
name: ui-ux-pro-max
description: Comprehensive design guide for web and mobile applications. Contains 67 styles, 161 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types across 16 technology stacks. Searchable database with priority-based recommendations.
---

# UI/UX Pro Max

AI design intelligence. Use the Python search engine to get UI styles, color
palettes, font pairings, landing-page patterns, chart types, and UX guidelines
before building or redesigning any interface.

Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT, v2.5.0)

## Generate a full design system

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/design_system.py "<project description>" --project-name "<name>"
```

## Domain search

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain> [-n <max>]
```

Domains: `product`, `style`, `typography`, `color`, `landing`, `chart`, `ux`

## Stack search

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack <stack>
```

Stacks: `html-tailwind` (default), `react`, `nextjs`, `astro`, `vue`, `nuxtjs`,
`nuxt-ui`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`,
`jetpack-compose`, `angular`, `laravel`, `threejs`

## Pre-delivery checklist (always apply)

- No emojis as icons — use SVG (Lucide / Heroicons)
- `cursor-pointer` on all clickable elements
- Hover states with smooth transitions (150–300ms)
- Light mode text contrast ≥ 4.5:1
- Visible focus states for keyboard navigation
- Respect `prefers-reduced-motion`
- Responsive at 375 / 768 / 1024 / 1440px

## Suplymate design system (generated)

- Style: **Swiss Modernism 2.0** — 12-col grid, Inter, 8px mathematical spacing,
  high contrast, single accent. Brand kept: navy `#0D3349` + mustard `#D4A017`.
- Landing pattern: **Social Proof-Focused** — client logos, stat counters,
  testimonials, credibility markers.
- Next.js: dynamic import heavy components, skeleton loaders, no layout shift.
