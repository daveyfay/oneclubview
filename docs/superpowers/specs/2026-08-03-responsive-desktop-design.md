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
- 5 nav items: Overview, Schedule, Money, Explore, Settings — each with icon (from ICN) + label. Active item gets `var(--color-primary)` text + `var(--color-primary-bg)` background pill.
- "Next up" mini-card — shows next event today: club name, time, kid color dot, relative countdown ("in 45 min"). Hidden if no events remain today. Uses `weekEvts` from HubDataContext.
- Divider line
- Quick-add button — replaces the floating FAB. Same menu options (Add event, Add payment, Add club, etc.)
- Dark mode toggle — small icon button at the very bottom

**Behavior:**
- Bottom tab bar hides on desktop via CSS `display: none` at > 1024px
- Sidebar hides on mobile/tablet via CSS `display: none` at <= 1024px
- No JS media query needed — pure CSS show/hide
- Sidebar entrance: `translateX(-20px)` + `opacity: 0` to `translateX(0)` + `opacity: 1`, 300ms ease-out on first render

**Data access:**
- Sidebar lives inside `HubDataProvider` (it's a child of Hub, not a sibling)
- Receives: `tab`, `setTab`, `filter`, `setFilter`, `kids`, `weekEvts`, `darkMode`, `setDarkMode`, FAB toggle callbacks — all as props from HubInner

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
.tab-content--settings { max-width: 520px !important; }
.tab-content--money { max-width: 640px !important; }
```

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

**WeekGrid 7-day mode:**
- New prop `columns={7}` (default 4, current behavior)
- When `columns={7}`: no pagination, no swipe, all 7 days visible
- Grid: `gridTemplateColumns: repeat(7, 1fr)` instead of `repeat(4, 1fr)`
- Hide the page indicator dots when showing 7 columns

### Money (single column, wider)

No layout changes. Just benefits from the wider `max-width: 640px` at the CSS level.

### Explore (existing wide layout)

Already works via `app-shell--wide`. Remove the inline `maxWidth` ternaries from Hub.jsx and let CSS handle it:

```css
.tab-content--explore { max-width: none; }
@media (min-width: 1024px) {
  .tab-content--explore { max-width: 960px; }
}
```

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

In Hub.jsx, track the previous tab index vs new tab index to decide direction. Apply the class to the `tab-content` wrapper via a `key` change that triggers remount.

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

All animations respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 6. Files Changed

| File | Change |
|---|---|
| `src/lib/global.css` | New breakpoint rules, remove old 900px breakpoint, add motion keyframes, hover states, reduced-motion, sidebar styles, layout grid classes |
| `src/pages/Hub.jsx` | Remove ALL inline maxWidth styles, restructure shell with sidebar + app-main wrapper, add tab direction tracking, pass props to sidebar, add CSS classes to elements |
| `src/components/DesktopSidebar.jsx` | **New file** — sidebar nav, kid filter, next-up card, quick-add, dark mode toggle |
| `src/pages/tabs/OverviewTab.jsx` | Wrap content in `.overview-grid` container |
| `src/pages/tabs/ScheduleTab.jsx` | Wrap content in `.schedule-grid` container, detect desktop for 7-day grid |
| `src/components/hub/WeekGrid.jsx` | Accept `columns` prop (4 or 7), hide pagination when 7 |

## 7. Not Changing

- Mobile layout (< 768px) — completely untouched
- OcvModal — stays centered overlay
- Backend / data layer — pure frontend CSS + layout
- Tab component internals — they just get wrapper divs
- Explore tab — already responsive
- Landing page — separate from Hub
