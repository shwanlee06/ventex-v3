# VENTEX Density System

> Design specification for the UI spacing, typography, and breathing room system.
> Updated: April 16, 2026

---

## Philosophy

VENTEX targets a **$50K/year enterprise** audience — venture holding operators, family offices, and institutional LPs. The UI must communicate precision, confidence, and calm. Every pixel of whitespace is intentional: too little feels like a startup prototype; too much feels empty. The goal is **instrument-grade density** — the feeling of a Bloomberg terminal crossed with a Swiss watch dial.

---

## Zone Contrast Rule

The interface uses two density zones:

| Zone | Purpose | Padding | Gap | Example |
|------|---------|---------|-----|---------|
| **Hero Zone** | Landing page sections, onboarding, marketing | `py-24` to `py-32` (96–128px) | `gap-8` to `gap-12` | SpyOps landing sections |
| **Data Zone** | Dashboards, tables, feeds, portals | `p-5` to `p-8` (20–32px) | `gap-4` to `gap-6` | Admin dashboard, client portal |

The contrast between these zones creates rhythm. Landing pages breathe; dashboards are dense but not cramped.

---

## Spacing Scale (8px base)

All spacing derives from an 8px base unit:

| Token | Value | Usage |
|-------|-------|-------|
| `1` | 4px | Icon gaps, inline spacing |
| `2` | 8px | Tight element gaps |
| `3` | 12px | Label-to-input, badge padding |
| `4` | 16px | Card internal gaps, mobile padding |
| `5` | 20px | Standard card padding |
| `6` | 24px | Desktop card padding, section gaps |
| `8` | 32px | Main container padding, section spacing |
| `10` | 40px | Hero card padding, primary containers |
| `12` | 48px | Section dividers |
| `16` | 64px | Landing page section padding (mobile) |
| `20` | 80px | Landing page section padding (tablet) |
| `24`–`32` | 96–128px | Landing page section padding (desktop) |

---

## Typography Rhythm

### Heading Scale (fluid clamp)

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H1 | `clamp(2.5rem, 5vw, 5rem)` | 200–300 | 0.92 | -0.02em | Landing hero headlines |
| H2 | `clamp(1.75rem, 3.5vw, 3rem)` | 200–300 | 0.95 | -0.01em | Section titles |
| H3 | `clamp(1.25rem, 2vw, 1.75rem)` | 400 | 1.1 | 0 | Card headers |
| Body | 0.875rem (14px) | 400 | 1.7 | 0 | Paragraph text |
| Micro | 0.6875rem (11px) | 500 | 1.4 | 0.1em | Labels, badges, metadata |

### Font Stack

- **Display**: Inter (variable weight 200–700)
- **Mono**: JetBrains Mono (tabular numbers, financial data)
- **System fallback**: system-ui, -apple-system, sans-serif

---

## Component Density

### Cards

| Variant | Padding | Border | Radius | Usage |
|---------|---------|--------|--------|-------|
| `app-card` | `p-8` (32px) | `border-white/[0.06]` | `1rem` | Admin dashboard cards |
| `client-card` | `p-10` (40px) | `border-white/[0.06]` | `1.25rem` | Client portal primary cards |
| `kpi-card` | `p-8` (32px) | `border-white/[0.06]` | `0.75rem` | Metric/stat cards |
| `data-card` | `p-5` (20px) | `border-white/[0.04]` | `0.75rem` | Feed items, list cards |

### Buttons

| Size | Padding | Min Height | Font Size |
|------|---------|------------|-----------|
| Default | `px-6 py-3` | 44px | 14px |
| Small | `px-4 py-2` | 36px | 12px |
| Large (CTA) | `px-9 py-4` | 52px | 14px |
| Touch target | — | 44px min | — |

### Table Rows

| Context | Row Height | Cell Padding | Font Size |
|---------|------------|--------------|-----------|
| Admin table | min 56px | `px-5 py-4` | 13px |
| Client list | min 56px | `px-5 py-4` | 13px |
| Feed items | min 52px | `px-5 py-4` | 13px |
| Compact list | min 44px | `px-4 py-3` | 12px |

---

## Responsive Breakpoints

| Breakpoint | Container Padding | Card Padding | Section Spacing |
|------------|-------------------|--------------|-----------------|
| Mobile (<640px) | `px-3` (12px) | `p-4` (16px) | `space-y-6` |
| Tablet (640–1024px) | `px-5`–`px-6` | `p-5`–`p-6` | `space-y-8` |
| Desktop (1024+) | `px-8`–`px-10` | `p-6`–`p-10` | `space-y-10` |
| Wide (1440+) | `px-12` | `p-8`–`p-10` | `space-y-12` |

---

## Micro-Details

These small signals communicate premium quality:

- **Border opacity**: `border-white/[0.06]` (not 0.1 — too visible; not 0.03 — invisible)
- **Card backgrounds**: `bg-white/[0.02]` to `bg-white/[0.04]` (subtle depth without noise)
- **Hover transitions**: `duration-200` (fast but perceptible)
- **Focus rings**: `ring-amber-400/50` (brand-aligned, accessible)
- **Dividers**: `border-white/[0.04]` with `my-8` to `my-12` spacing
- **Status badges**: `px-2.5 py-1` with `rounded-full` and `text-[10px] tracking-wider`
- **Active feedback**: `active:scale-[0.97]` on interactive cards (subtle press)
- **Touch manipulation**: `touch-manipulation` on all interactive elements for mobile

---

## CSS Custom Classes

These utility classes are defined in `client/src/index.css`:

```css
.app-card      /* Standard admin card with p-8, border, radius */
.client-card   /* Client portal card with p-10, larger radius */
.kpi-card      /* Metric card with p-8, tabular-nums */
.status-badge  /* Inline status indicator */
.micro-label   /* 11px uppercase tracking-wider label */
.divider-subtle /* Horizontal rule with 0.04 opacity */
.divider-section /* Heavier section break with 0.08 opacity */
```

---

## Changelog

- **2026-04-16**: Initial density system — global CSS tokens, landing page, admin dashboard, client portal, distributions page
