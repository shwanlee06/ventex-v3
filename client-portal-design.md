# Client Portal Design Language — UHNWI/HNWI

## Color Palette (OKLCH for Tailwind 4)
- Background: Deep charcoal black (#0A0A0B) — not pure black, slightly warm
- Card surface: #141416 — subtle elevation
- Card elevated: #1C1C1F — for hover/active states
- Gold accent: #C9A96E — warm champagne gold (primary CTA, highlights)
- Gold light: #D4BA82 — lighter gold for text accents
- Gold muted: rgba(201,169,110,0.15) — gold tint for backgrounds
- Text primary: #F5F5F0 — warm white, not harsh
- Text secondary: #8A8A8A — muted gray
- Text tertiary: #5A5A5A — very subtle
- Success: #4ADE80 — soft green
- Border: rgba(255,255,255,0.06) — barely visible

## Typography
- Headings: Inter with wide letter-spacing (0.12em), uppercase, light weight (300)
- Body: Inter, 16px base, regular weight (400)
- Numbers/Values: Inter, tabular-nums, medium weight (500)
- Large values (portfolio): 36-48px, light weight, letter-spacing 0.02em

## Spacing
- Horizontal padding: 24px mobile, 32px tablet
- Card padding: 24px
- Card gap: 16px
- Section gap: 32-40px
- Card border-radius: 16px
- Button border-radius: 12px

## Components
- Cards: bg-[#141416] with 1px border rgba(255,255,255,0.06), 16px radius
- Buttons: Gold gradient or gold outline, 48px height minimum
- Bottom nav: 3 items max (Portfolio, Activity, Profile), frosted glass bg
- Status badges: Pill shape, muted bg with colored text
- Dividers: rgba(255,255,255,0.04) — barely there

## Animations
- Page transitions: fade + slight upward slide (200ms)
- Card appear: staggered fade-in (50ms delay between cards)
- Value counters: animate numbers on load
- Touch feedback: subtle scale(0.98) on press

## Mobile Layout
- Full-width cards edge to edge (with 24px padding)
- Hero greeting: "Good evening, [First Name]" — large, elegant
- Portfolio value: massive number, center-aligned
- Venture cards: full-width, image optional, key metrics below
- Bottom safe area: 34px for home indicator
