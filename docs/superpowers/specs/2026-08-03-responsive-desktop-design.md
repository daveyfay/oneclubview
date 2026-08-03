# Responsive Desktop Layout + Motion Polish

## Summary

Transform OneClubView from a 520px mobile-only layout to a responsive app with three breakpoints: mobile (< 768px, unchanged), tablet (768-1024px, wider column), and desktop (> 1024px, sidebar nav + adaptive two-column content). Add motion and micro-interactions across all breakpoints.

## 1. Breakpoints

| Breakpoint | Width | Nav | Content |
|---|---|---|---|
| Mobile | < 768px | Bottom tab bar (current) | Single column, 100% width |
| Tablet | 768px - 1024px | Bottom tab bar | Single column, max-width 720px |
| Desktop | > 1024px | Left sidebar, 260px fixed | Adaptive per tab |

## 2. Desktop Sidebar (> 1024px)

New component `src/components/DesktopSidebar.jsx`, fixed left, 260px wide.

**Contents (top to bottom):**
- Logo
- Kid filter pills — colored COLS dots + first names (currently in header on mobile). Tapping filters all tabs by kid. "All" option with multi-colored dot.
- 4 nav items: Overview, Schedule, Money, Explore — each with icon (from ICN) + label. Active item gets `var(--color-primary)` text + `var(--color-primary-bg)` background pill. Tab IDs: `"overview"`, `"week"`, `"money"`, `"explore"` (note: Schedule tab ID is `"week"` in code).
- Settings gear icon button — NOT a nav item. Calls `setShowProfile(true)` to open the existing Settings overlay panel. Positioned below the nav items with a divider.
- "Next up" mini-card — shows next event today. Logic: filter `weekEvts` to today + future times, sort by time, pick first. Shows club name, time, kid color dot, relative countdown ("in 45 min"). Hidden if no events remain today. Countdown uses a `useEffect` with 60-second interval timer that recalculates minutes remaining.
- Divider line
- Quick-add button — replaces the floating FAB on desktop. Same menu options (Add event, Add payment, Add club, etc.). FAB itself hidden via CSS at > 1024px.
- Dark mode toggle — small icon button at the very bottom

**Behavior:**
- Bottom tab bar hides on desktop via CSS `display: none` at > 1024px
- Sidebar hides on mobile/tablet via CSS `display: none` at <= 1024px
- No JS media query needed — pure CSS show/hide
- Sidebar entrance: `translateX(-20px)` + `opacity: 0` to `translateX(0)` + `opacity: 1`, 300ms ease-out on first render

**Data access:**
- Sidebar lives inside `HubDataProvider` (it's a child of Hub, not a sibling)
- Receives: `tab`, `setTab`, `filter`, `setFilter`, `kids`, `weekEvts`, `darkMode`, `setDarkMode`, `showProfile`, `setShowProfile`, FAB toggle callbacks — all as props from HubInner

## 3. Hub.jsx Shell Restructure

**Current structure:**
```
<div class="app-shell" style="maxWidth: 520">
  <header style="maxWidth: 520">...</header>
  <tab-bar style="maxWidth: 520">...</tab-bar>
  <content style="maxWidth: 520">...</content>
  <floating-fab />
</div>
```

**New structure:**
```
<div class="app-shell">
  <DesktopSidebar />          <!-- CSS: hidden below 1024px -->
  <div class="app-main">
    <header>...</header>       <!-- CSS controls max-width per breakpoint -->
    <tab-bar>...</tab-bar>     <!-- CSS: hidden above 1024px -->
    <content>...</content>     <!-- CSS controls max-width per breakpoint -->
  </div>
</div>
```

**Critical change:** Remove ALL inline `maxWidth` styles from Hub.jsx. Move width constraints to CSS classes with media query overrides. This fixes the LESSONS.md issue where inline styles override CSS classes.

**All inline maxWidth locations in Hub.jsx:**
| Line | Element | Current value | Action |
|------|---------|---------------|--------|
| 138 | Loading skeleton wrapper | `520` | Replace with `.app-header-inner` class |
| 174 | Paywall wrapper | `400` | **Keep as-is** — centered card, intentional |
| 223 | Header inner | `tab === "explore" ? 960 : 520` | Replace with `.app-header-inner` class |
| 238 | Tab bar | `tab === "explore" ? 960 : 520` | Replace with `.app-tab-bar` class |
| 243 | Tab content | `tab === "explore" ? "none" : 520` | Replace with `.tab-content` + per-tab class |

Also remove the `app-shell--wide` conditional class toggle on line 216 and its CSS rule in global.css — the per-tab content classes replace it.

**CSS classes:**
```css
.app-shell {
  min-height: 100vh;
  background: var(--color-warm);
}

.app-main {
  /* Mobile: full width */
}

.app-header-inner {
  max-width: 520px;
  margin: 0 auto;
  padding: 12px 20px 6px;
}

.app-tab-bar {
  max-width: 520px;
  margin: 0 auto;
}

.tab-content {
  max-width: 520px;
  margin: 0 auto;
  padding: 16px 20px;
  padding-bottom: 100px;
}

@media (min-width: 768px) {
  .app-header-inner,
  .app-tab-bar,
  .tab-content {
    max-width: 720px;
  }
}

@media (min-width: 1024px) {
  .app-shell {
    display: flex;
  }
  .app-main {
    flex: 1;
    min-width: 0;
  }
  .app-header-inner,
  .tab-content {
    max-width: 960px;
  }
  .app-tab-bar {
    display: none; /* sidebar replaces bottom tabs */
  }
  .tab-content {
    padding-bottom: 40px; /* no bottom tab bar overlap */
  }
}
```

**Tab-specific overrides (via class on tab-content):**
```css
@media (min-width: 1024px) {
  .tab-content--money { max-width: 640px; }
  .tab-content--explore { max-width: 960px; }
}
```
Settings is not a tab — it opens as an overlay, so no tab-content class needed for it.

## 4. Adaptive Content Layouts Per Tab

### Overview (two-column on desktop)

Wrap content in a grid container that goes two-column at > 1024px:

```css
.overview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 1024px) {
  .overview-grid {
    grid-template-columns: 1fr 1fr;
  }
}
```

- Left column: stat cards, alerts, weekly summary
- Right column: today's timeline, upcoming events
- Cards that should span both columns (like the welcome banner) use `grid-column: 1 / -1`

### Schedule (two-column on desktop)

```css
.schedule-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 1024px) {
  .schedule-grid {
    grid-template-columns: 1fr 380px;
  }
}
```

- Left: WeekGrid (now showing all 7 days) + view toggle + insight cards
- Right: selected day detail panel (sticky, `position: sticky; top: 80px`)
- On mobile: day detail still slides below the grid (current behavior)

**Desktop detection for WeekGrid:**

This is the one exception to the "pure CSS" approach — the WeekGrid column count is a data/logic change (7 days vs paginated 4), not just a style change. Add a small `useIsDesktop` hook in `src/hooks/useIsDesktop.js`:

```js
import { useState, useEffect } from 'react';
export function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(`(min-width: ${breakpoint}px)`).matches);
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (e) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isDesktop;
}
```

ScheduleTab calls `useIsDesktop()` and passes `columns={isDesktop ? 7 : 4}` to WeekGrid.

**WeekGrid 7-day mode (`columns` prop):**
- New prop `columns` (default 4, current behavior)
- When `columns === 7`:
  - `pageDays` = all 7 `weekDays` (bypass the page slicing on current line ~24)
  - All three `gridTemplateColumns: "repeat(4,1fr)"` inline styles (day labels row, activity grid rows) become `repeat(columns,1fr)`
  - Swipe handlers (`onTouchStart`, `onTouchEnd`) disabled — no pagination needed
  - Page indicator dots + chevrons hidden
  - Page state (`useState`) can remain but is unused
- When `columns === 4`: everything works exactly as today

### Money (single column, wider)

No layout changes. Just benefits from the wider `max-width: 640px` at the CSS level.

### Explore (existing wide layout)

Remove the `app-shell--wide` conditional class and its inline `maxWidth` ternaries from Hub.jsx. Let the `.tab-content--explore` CSS class handle it (defined in Section 3).

The existing second `@media (min-width: 900px)` block in global.css (lines 485-498) controls Explore's sidebar layout (`.explore-sidebar`, `.explore-mobile-pills`). Move this breakpoint to `1024px` to align with the new breakpoint system.

### Settings (single column, narrow)

Stays at 520px via `.tab-content--settings`.

## 5. Motion & Micro-interactions

### Tab transitions (all breakpoints)

```css
@keyframes tabSlideInLeft {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes tabSlideInRight {
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: translateX(0); }
}
.tab-enter-left { animation: tabSlideInLeft .25s ease-out; }
.tab-enter-right { animation: tabSlideInRight .25s ease-out; }
```

In Hub.jsx, add a `useRef` for previous tab index. Tab order: `["overview","week","money","explore"]`. On tab change, compare old index vs new to determine direction. Apply the animation class to the `tab-content` wrapper. Use `key={tab}` on the wrapper to trigger remount (which re-runs the entrance animation).

### Card entrance (all breakpoints)

Enhance existing `stagger-card` class:
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.stagger-card {
  animation: fadeInUp .3s ease-out both;
}
```

### Hover states (desktop only)

```css
@media (hover: hover) {
  .card-hover {
    transition: transform .15s ease, box-shadow .15s ease;
  }
  .card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,.1);
  }
}
```

Add `card-hover` class to event cards in schedule list, overview cards, money payment cards. Uses `@media (hover: hover)` so touch devices don't get stuck hover states.

### Sidebar active indicator (desktop)

The active nav item has a colored left border (3px) that transitions position:
```css
.sidebar-nav-item {
  transition: background .2s, color .2s;
  border-left: 3px solid transparent;
}
.sidebar-nav-item--active {
  border-left-color: var(--color-primary);
  background: var(--color-primary-bg);
  color: var(--color-primary);
}
```

### Reduced motion

All animations respect `prefers-reduced-motion`. This rule already exists in global.css (lines 501-507) — no new CSS needed. Just ensure new keyframe animations use standard `animation` properties so the existing rule catches them.

## 6. Files Changed

| File | Change |
|---|---|
| `src/lib/global.css` | New breakpoint rules, remove old 900px breakpoint, add motion keyframes, hover states, reduced-motion, sidebar styles, layout grid classes |
| `src/pages/Hub.jsx` | Remove ALL inline maxWidth styles, restructure shell with sidebar + app-main wrapper, add tab direction tracking, pass props to sidebar, add CSS classes to elements |
| `src/components/DesktopSidebar.jsx` | **New file** — sidebar nav, kid filter, next-up card, quick-add, dark mode toggle |
| `src/pages/tabs/OverviewTab.jsx` | Wrap content in `.overview-grid` container |
| `src/pages/tabs/ScheduleTab.jsx` | Wrap content in `.schedule-grid` container, detect desktop for 7-day grid |
| `src/components/hub/WeekGrid.jsx` | Accept `columns` prop (4 or 7), conditional pagination/swipe |
| `src/hooks/useIsDesktop.js` | **New file** — `useIsDesktop()` hook wrapping `matchMedia` |

## 7. Not Changing

- Mobile layout (< 768px) — completely untouched
- OcvModal — stays centered overlay
- Backend / data layer — pure frontend CSS + layout
- Tab component internals — they just get wrapper divs
- Landing page — separate from Hub
- Paywall screen (Hub.jsx line 174, maxWidth: 400) — intentionally narrow centered card
- Settings tab — stays as overlay panel, not a real tab
