# OneClubView Full Redesign — "Meadow"

## Vision

Transform OneClubView from a flat, corporate-feeling utility into a warm, distinctly Irish family app that feels as polished as Linear but as inviting as a kitchen table. No family scheduling app currently achieves this level of design sophistication — that's our opportunity.

## Design Identity

### Color System

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-primary` | `#2D6A4F` | `#52B788` | Headings, nav active, primary buttons |
| `--color-primary-light` | `#52B788` | `#74C69D` | Links, interactive highlights |
| `--color-primary-bg` | `#EDF5F0` | `#1A2F25` | Selected states, tinted cards |
| `--color-accent` | `#E07A5F` | `#E07A5F` | CTAs, badges, urgency, single primary action per screen |
| `--color-gold` | `#F2CC8F` | `#D4A96A` | Paid confirmations, achievements, premium features |
| `--color-success` | `#52B788` | `#74C69D` | Same as primary-light (green = inherently positive) |
| `--color-danger` | `#E63946` | `#FF6B6B` | Overdue, destructive actions |
| `--color-warm` | `#FAF8F5` | `#161B19` | Page background |
| `--color-card` | `#FFFEFB` | `#1E2422` | Card surfaces (warm off-white, not pure white) |
| `--color-surface` | `#F5F0EB` | `#232B27` | Secondary surfaces, sidebar, alternating rows |
| `--color-text` | `#2B2D2E` | `#E8E6E3` | Body text |
| `--color-muted` | `#8C8A85` | `#6B6966` | Labels, secondary text |
| `--color-border` | `rgba(45,106,79,.10)` | `rgba(82,183,136,.12)` | Card borders, dividers |

### Member Colors (kids)

Replace current COLS with warmer, more distinct palette:
```js
export const COLS = ["#2D6A4F", "#E07A5F", "#457B9D", "#9B5DE5", "#F4845F", "#00B4D8", "#E76F51", "#6A994E"];
```

### Typography

| Role | Font | Weights | Size range |
|---|---|---|---|
| Display/Headings | DM Serif Display | 400 | 26-42px |
| Body/UI | DM Sans | 400, 500, 700 | 13-16px |
| Data/Mono | DM Mono | 400 | 12-14px (fees, times) |

Scale: 12 / 13 / 14 / 16 / 20 / 26 / 34 / 42px. Base body at 15px.

**Signature detail**: Headings render in `--color-primary` (forest green) rather than black. This creates a distinctive look that's immediately recognizable.

### Shadows

Warm-tinted, green-hued:
```css
--shadow: 0 2px 8px rgba(45,106,79,.05), 0 1px 3px rgba(0,0,0,.04);
--shadow-lg: 0 8px 24px rgba(45,106,79,.08), 0 2px 6px rgba(0,0,0,.03);
--shadow-float: 0 12px 32px rgba(45,106,79,.12);
```

### Component Language

| Element | Spec |
|---|---|
| Card radius | 14px |
| Button radius | 24px (soft rect, not full pill) |
| Input radius | 10px |
| Card padding | 20px |
| Card border | 1px `var(--color-border)` |
| Card bg | `var(--color-card)` (warm off-white) |
| Primary button | Solid `--color-primary`, off-white text |
| Accent button | Solid `--color-accent`, one per screen |
| Secondary button | `--color-surface` bg, green text |
| Destructive | Text-only red, never filled red |

---

## Phase 1: Visual Identity + Navigation (ship first)

This phase alone will transform how the app feels.

### 1A. Design Tokens

Replace all CSS variables in global.css `:root` with the Meadow palette. Update dark mode variables. Replace font-family declarations. Load DM Serif Display, DM Sans, DM Mono from Google Fonts in index.html.

### 1B. Bottom Tab Bar

**Move tab bar from top to bottom of screen.** This is the #1 UX fix.

Mobile tab bar spec:
- Fixed to bottom, floating 8px above edge
- Warm translucent background (`var(--color-card)` at 92% opacity + `backdrop-filter: blur(20px)`)
- Border-radius: 20px
- 5 tabs: Home, Schedule, Money, Explore, Settings (add Settings as a real tab)
- Active tab: filled icon + label, `--color-primary`
- Inactive: outlined icon only, `--color-muted`
- Safe area padding for iPhone notch (`env(safe-area-inset-bottom)`)

Header becomes compact:
- Logo + notification bell + profile avatar only
- Kid filter pills move behind a tap-to-expand toggle (or into sidebar on desktop)
- Total header height: ~56px (currently ~180px)

### 1C. Desktop Sidebar Upgrade

Current sidebar is mostly nav duplication. Make it genuinely useful:
- Family member avatars with next event for each kid
- Today's timeline (not just "next up" — show all remaining events)
- Quick-add dropdown (not bottom sheet)
- Upcoming fees summary
- Navigation items with the serif font at 16px, 48px row height

### 1D. Rename Tabs

| Current | New | Tab ID | Rationale |
|---|---|---|---|
| Overview | Home | `home` | Parents understand "Home" instantly |
| Schedule | Schedule | `week` | Fine as-is |
| Money | Money | `money` | Fine, but show to all family roles |
| Explore | Explore | `explore` | Fine as-is |
| (Settings overlay) | Settings | `settings` | Make it a real tab |

Show Money tab to ALL family roles (not just admin). Carers need fee visibility.

---

## Phase 2: "Today" Focus + Bento Dashboard

### 2A. Home Tab Redesign (bento grid)

Replace the current OverviewTab card stack with a bento grid dashboard.

**Bento grid spec:**
- 2-column grid on mobile, 3 on tablet, 4 on desktop
- Gap: 12px
- Tiles have different sizes: 1x1 (stat), 2x1 (timeline), 2x2 (week preview)

**Tiles:**
1. **"Good morning, Dave"** greeting tile (2x1) — time-aware greeting + summary sentence ("Luca has soccer at 4, no clashes today")
2. **Today's timeline** (2x1 or 2x2) — vertical timeline of today's events with times, club colors, kid dots. This is the hero content.
3. **Activity count** (1x1) — CountUp animated number
4. **Fees due** (1x1) — amount with gold accent if all paid
5. **Tomorrow preview** (2x1) — compact list of tomorrow's events
6. **Week at a glance** (2x1) — tiny 7-day grid with colored dots (not the full WeekGrid)
7. **Family** (2x1) — kid avatars with activity count badges

### 2B. Schedule Tab "Today First"

Default view should focus on TODAY:
- Today's events prominent at top
- Tomorrow secondary
- Rest of week available via scroll or swipe
- The full week grid is still accessible via the segmented control

---

## Phase 3: Motion + Polish

### 3A. Spring-based transitions

Use CSS spring approximations (cubic-bezier with overshoot):
```css
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-settle: cubic-bezier(0.22, 0.61, 0.36, 1);
```

- Tab content: crossfade + 12px upward float, 300ms
- Cards: staggered fadeInUp (40ms delay per card)
- Press states: `scale(0.98)` with 150ms spring
- Tab bar indicator: slides between tabs with spring overshoot
- Modal entrance: scale from 0.95 + fade, 250ms spring

### 3B. Celebration moments

- Mark fee as paid: gold shimmer on the card + subtle confetti
- Complete all events for a day: "All done!" animation
- Add a new club: welcome pulse

### 3C. Custom icons

Replace generic emoji on tabs/categories with custom line-art style icons that match the Meadow identity:
- Warm, hand-drawn feel
- Forest green stroke color
- Consistent 24px grid

---

## Phase 4: Component Extraction + Code Quality

### 4A. Extract reusable components

From the UX audit — these are duplicated 3-4 times each:
- `EventCard` — the colored-border event row (used in list view, day panel, calendar panel)
- `ConfirmDialog` — replace all `window.confirm()` calls
- `StatTile` — bento grid stat cell with CountUp
- `TimelineDot` — vertical timeline event marker

### 4B. Spacing/typography system

Extract inline styles into CSS utility classes:
- `.text-display`, `.text-heading`, `.text-body`, `.text-caption`
- `.space-xs` (4px), `.space-sm` (8px), `.space-md` (16px), `.space-lg` (24px), `.space-xl` (32px)

---

## Files Changed (Phase 1)

| File | Change |
|---|---|
| `index.html` | Replace Google Fonts link (DM Serif Display + DM Sans + DM Mono) |
| `src/lib/global.css` | Replace ALL design tokens, update dark mode, add bottom tab bar styles |
| `src/lib/constants.js` | Update COLS member palette |
| `src/pages/Hub.jsx` | Move tab bar to bottom, compact header, remove kid pills from header |
| `src/components/DesktopSidebar.jsx` | Upgrade with timeline, family avatars, fee summary |
| `src/pages/tabs/OverviewTab.jsx` | Rename to HomeTab, bento grid (Phase 2) |

## Not Changing (Phase 1)

- Tab content components (Schedule, Money, Explore internals)
- Backend / Supabase
- Modal components (EventDetailModal already redesigned)
- Landing page
