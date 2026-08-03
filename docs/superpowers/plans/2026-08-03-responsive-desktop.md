# Responsive Desktop Layout + Motion Polish — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the 520px mobile-only layout into a responsive app with sidebar nav on desktop, adaptive content layouts per tab, and motion/micro-interactions.

**Architecture:** CSS-first approach — replace all inline `maxWidth` styles with CSS classes that respond to three breakpoints (mobile < 768px, tablet 768-1024px, desktop > 1024px). New `DesktopSidebar` component shown via CSS at > 1024px. One JS hook (`useIsDesktop`) for WeekGrid's 7-column mode. Tab transitions and hover states via CSS keyframes.

**Tech Stack:** React 19, CSS media queries, `window.matchMedia` for one hook

**Spec:** `docs/superpowers/specs/2026-08-03-responsive-desktop-design.md`

---

## Chunk 1: Foundation — Hook + CSS Breakpoints + Motion

### Task 1: Create `useIsDesktop` hook

**Files:**
- Create: `src/hooks/useIsDesktop.js`

- [ ] **Step 1: Create the hook file**

Create `src/hooks/useIsDesktop.js`:

```js
import { useState, useEffect } from 'react';

export function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(min-width: ${breakpoint}px)`).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (e) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isDesktop;
}
```

- [ ] **Step 2: Verify build**

Run: `cd C:/Users/dfay/oneclubview && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useIsDesktop.js
git commit -m "feat: add useIsDesktop media query hook"
```

---

### Task 2: CSS breakpoints, layout classes, and motion keyframes

**Files:**
- Modify: `src/lib/global.css:471-508` (replace old breakpoints, add new ones)

- [ ] **Step 1: Replace the existing responsive section**

In `src/lib/global.css`, find the section starting at line 471 (`/* Responsive — laptop: constrain app views, let landing go wide */`) through line 507 (end of `prefers-reduced-motion`). Replace the ENTIRE block (lines 471-507) with:

```css
/* ── Responsive Layout ── */

/* Desktop sidebar */
.desktop-sidebar {
  display: none;
}

/* App shell layout classes */
.app-header-inner {
  max-width: 520px;
  margin: 0 auto;
  padding: 12px 20px 6px;
}
.app-tab-bar {
  max-width: 520px;
  margin: 0 auto;
}

/* Tablet */
@media (min-width: 768px) {
  .app-header-inner,
  .app-tab-bar,
  .tab-content {
    max-width: 720px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  body { display: flex; justify-content: center; }
  #root { width: 100%; position: relative; }

  .app-shell {
    display: flex;
    max-width: 1280px;
    margin: 0 auto;
  }
  .app-main {
    flex: 1;
    min-width: 0;
  }
  .desktop-sidebar {
    display: flex;
  }
  .app-header-inner,
  .tab-content {
    max-width: 960px;
  }
  .tab-content--money {
    max-width: 640px;
  }
  .tab-content--explore {
    max-width: 960px;
  }
  .app-tab-bar {
    display: none;
  }
  .tab-content {
    padding-bottom: 40px;
  }
  .fab-btn {
    display: none !important;
  }
}

/* Explore tab layout */
.explore-layout { display: flex; gap: 0; }
.explore-sidebar { display: none; }
.explore-content { flex: 1; min-width: 0; }
.explore-mobile-pills { display: flex; }

@media (min-width: 1024px) {
  .explore-sidebar {
    display: block;
    width: 220px;
    flex-shrink: 0;
    padding: 0 20px 0 0;
    border-right: 1px solid var(--color-border);
    margin-right: 24px;
    position: sticky;
    top: 0;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }
  .explore-mobile-pills { display: none !important; }
}

/* ── Motion & Micro-interactions ── */

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.stagger-card {
  animation: fadeInUp .3s ease-out both;
}

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

@keyframes sidebarSlideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Hover lift for cards — desktop only */
@media (hover: hover) {
  .card-hover {
    transition: transform .15s ease, box-shadow .15s ease;
  }
  .card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,.1);
  }
}

/* Two-column desktop layouts */
.overview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.schedule-desktop {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 1024px) {
  .overview-grid {
    grid-template-columns: 1fr 1fr;
  }
  .overview-grid > .overview-full-width {
    grid-column: 1 / -1;
  }
  .schedule-desktop {
    grid-template-columns: 1fr 380px;
  }
  .schedule-desktop__detail {
    position: sticky;
    top: 80px;
    align-self: start;
  }
}

/* Sidebar styles */
.desktop-sidebar {
  width: 260px;
  flex-shrink: 0;
  flex-direction: column;
  background: var(--color-card);
  border-right: 1px solid var(--color-border);
  padding: 16px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  animation: sidebarSlideIn .3s ease-out;
}
.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-muted);
  width: 100%;
  text-align: left;
  transition: background .2s, color .2s;
  border-left: 3px solid transparent;
}
.sidebar-nav-item--active {
  border-left-color: var(--color-primary);
  background: var(--color-primary-bg);
  color: var(--color-primary);
}
.sidebar-nav-item:hover:not(.sidebar-nav-item--active) {
  background: var(--color-warm);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd C:/Users/dfay/oneclubview && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/lib/global.css
git commit -m "feat: responsive CSS breakpoints, layout classes, and motion keyframes"
```

---

## Chunk 2: Hub.jsx Shell Restructure

### Task 3: Remove inline maxWidth, add CSS classes, add tab direction tracking

**Files:**
- Modify: `src/pages/Hub.jsx`

This task has many targeted edits. Read the file first, then make each edit in sequence.

- [ ] **Step 1: Add `useRef` import and tab direction tracking**

At the top of `HubInner` function (after the existing `useRef` for `ptrDist` on line 61), add:

```js
const prevTabRef = useRef(tab);
const tabDir = useRef("right");
```

- [ ] **Step 2: Update `handleChangeTab` to track direction**

Replace the `handleChangeTab` function (lines 108-112) with:

```js
function handleChangeTab(newTab, subTab) {
  const tabOrder = ["overview", "week", "money", "explore"];
  const oldIdx = tabOrder.indexOf(tab);
  const newIdx = tabOrder.indexOf(newTab);
  tabDir.current = newIdx >= oldIdx ? "right" : "left";
  prevTabRef.current = tab;
  setTab(newTab);
  if (newTab === "explore" && subTab) setExploreSubTab(subTab);
  window.scrollTo(0, 0);
}
```

Also update the tab bar button `onClick` (line 239) to use `handleChangeTab` instead of `setTab` directly. Change:
```js
onClick={() => { setTab(t.id); track("tab_view", { tab: t.id }); window.__haptic && window.__haptic() }}
```
to:
```js
onClick={() => { handleChangeTab(t.id); track("tab_view", { tab: t.id }); window.__haptic && window.__haptic() }}
```

- [ ] **Step 3: Fix loading skeleton — replace inline maxWidth**

On line 138, change:
```js
<div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 20px" }}>
```
to:
```js
<div className="app-header-inner" style={{ padding: "16px 20px" }}>
```

- [ ] **Step 4: Fix app-shell wrapper — remove app-shell--wide and inline style**

On line 216, change:
```jsx
<div className={"anim-fade app-shell" + (tab === "explore" ? " app-shell--wide" : "")} style={{ background: "var(--color-warm)", minHeight: "100vh" }} onTouchStart={ptrTouchStart} onTouchMove={ptrTouchMove} onTouchEnd={ptrTouchEnd}>
```
to:
```jsx
<div className="anim-fade app-shell" style={{ background: "var(--color-warm)", minHeight: "100vh" }} onTouchStart={ptrTouchStart} onTouchMove={ptrTouchMove} onTouchEnd={ptrTouchEnd}>
```

- [ ] **Step 5: Wrap everything after app-shell in an `app-main` div**

After the opening `<div className="anim-fade app-shell" ...>` tag (line 216) and after the pull-to-refresh indicator (line 220), add:

```jsx
<div className="app-main">
```

And close it just before the final `</div>` of the return (before the FAB modals section at line 349). The DesktopSidebar will be added in a later task between the app-shell and app-main divs.

- [ ] **Step 6: Fix header inner — replace inline maxWidth**

On line 223, change:
```js
<div style={{ maxWidth: tab === "explore" ? 960 : 520, margin: "0 auto", padding: "12px 20px 6px" }}>
```
to:
```js
<div className="app-header-inner">
```

- [ ] **Step 7: Fix tab bar — replace inline maxWidth**

On line 238, change:
```js
<div role="tablist" aria-label="Main navigation" style={{ maxWidth: tab === "explore" ? 960 : 520, margin: "0 auto", display: "flex" }}>
```
to:
```js
<div role="tablist" aria-label="Main navigation" className="app-tab-bar" style={{ display: "flex" }}>
```

- [ ] **Step 8: Fix tab content — replace inline maxWidth, add direction class**

On line 243, change:
```jsx
<div key={tab} className="tab-content" style={{ maxWidth: tab === "explore" ? "none" : 520, margin: "0 auto", padding: "16px 20px", paddingBottom: 100 }}>
```
to:
```jsx
<div key={tab} className={"tab-content" + (tab === "explore" ? " tab-content--explore" : tab === "money" ? " tab-content--money" : "") + " tab-enter-" + (tabDir.current === "right" ? "right" : "left")} style={{ margin: "0 auto", padding: "16px 20px", paddingBottom: 100 }}>
```

- [ ] **Step 9: Add `weekEvts` to HubInner's destructured data**

On line 36-39, add `weekEvts` to the destructured values from `useHubData()`:

```js
const {
  kids, clubs, pays, loading, isAdmin, members,
  familyMembers, notifications, load, userLoc, weekEvts,
} = useHubData();
```

This is needed for the DesktopSidebar's "Next up" card (Task 4).

- [ ] **Step 10: Verify build**

Run: `cd C:/Users/dfay/oneclubview && npm run build`

- [ ] **Step 11: Commit**

```bash
git add src/pages/Hub.jsx
git commit -m "refactor: remove inline maxWidth, add CSS classes and tab direction"
```

---

## Chunk 3: Desktop Sidebar

### Task 4: Create DesktopSidebar component

**Files:**
- Create: `src/components/DesktopSidebar.jsx`
- Modify: `src/pages/Hub.jsx` (add import + render)

- [ ] **Step 1: Create `src/components/DesktopSidebar.jsx`**

```jsx
import { useState, useEffect, useMemo } from 'react';
import { COLS } from '../lib/constants';
import ICN from '../lib/icons';
import Logo from './Logo';
import { isToday } from '../lib/utils';

const overviewIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const settingsIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: overviewIcon },
  { id: "week", label: "Schedule", icon: ICN.calendar },
  { id: "money", label: "Money", icon: ICN.wallet },
  { id: "explore", label: "Explore", icon: ICN.search },
];

export default function DesktopSidebar({
  tab, onChangeTab, filter, setFilter, kids, members,
  weekEvts, darkMode, setDarkMode, showProfile, setShowProfile,
  isAdmin, onShowFab,
}) {
  // Next up — next event today
  const nextUp = useMemo(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return (weekEvts || [])
      .filter(e => !e.skipped && isToday(e.date) && e.time)
      .filter(e => {
        const [h, m] = e.time.split(":").map(Number);
        return h * 60 + m > nowMins;
      })
      .sort((a, b) => a.time.localeCompare(b.time))[0] || null;
  }, [weekEvts]);

  const [minsLeft, setMinsLeft] = useState(() => {
    if (!nextUp?.time) return null;
    const now = new Date();
    const [h, m] = nextUp.time.split(":").map(Number);
    return Math.max(0, (h * 60 + m) - (now.getHours() * 60 + now.getMinutes()));
  });

  useEffect(() => {
    if (!nextUp?.time) return;
    const timer = setInterval(() => {
      const now = new Date();
      const [h, m] = nextUp.time.split(":").map(Number);
      setMinsLeft(Math.max(0, (h * 60 + m) - (now.getHours() * 60 + now.getMinutes())));
    }, 60000);
    return () => clearInterval(timer);
  }, [nextUp]);

  const visibleNavItems = isAdmin ? NAV_ITEMS : NAV_ITEMS.filter(n => n.id !== "money");

  return (
    <aside className="desktop-sidebar">
      {/* Logo */}
      <div style={{ marginBottom: 20 }}>
        <Logo />
      </div>

      {/* Kid filter pills */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Filter</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => setFilter(m.id)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                border: filter === m.id ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                background: filter === m.id ? "var(--color-primary-bg)" : "var(--color-card)",
                color: filter === m.id ? "var(--color-primary)" : "var(--color-text)",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}
            >
              {m.type === "kid" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLS[members.indexOf(m) % COLS.length] }} />}
              {m.type === "all" ? "All" : m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 16 }}>
        {visibleNavItems.map(n => (
          <button
            key={n.id}
            className={"sidebar-nav-item" + (tab === n.id ? " sidebar-nav-item--active" : "")}
            onClick={() => onChangeTab(n.id)}
          >
            <span style={{ display: "flex", opacity: tab === n.id ? 1 : .6 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      {/* Settings button */}
      <button
        className="sidebar-nav-item"
        onClick={() => setShowProfile(true)}
        style={{ marginBottom: 16 }}
      >
        <span style={{ display: "flex", opacity: .6 }}>{settingsIcon}</span>
        Settings
      </button>

      {/* Next up card */}
      {nextUp && (
        <div style={{
          background: "var(--color-primary-bg)", borderRadius: 12, padding: 12,
          marginBottom: 16, border: "1px solid var(--color-border)"
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Next up</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: nextUp.colour || "var(--color-primary)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextUp.club || nextUp.title}</div>
              <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                {nextUp.time}{nextUp.member ? " \u00B7 " + nextUp.member : ""}
                {minsLeft != null && <span style={{ color: "var(--color-accent)", fontWeight: 700, marginLeft: 6 }}>in {minsLeft}m</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Quick add */}
      <button
        onClick={onShowFab}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          width: "100%", padding: "10px 0", borderRadius: 10,
          background: "linear-gradient(135deg,var(--color-primary),var(--color-primary-light))",
          color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "var(--font-sans)", marginBottom: 12,
        }}
      >
        + Add
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 8, border: "none",
          background: "none", cursor: "pointer", fontFamily: "var(--font-sans)",
          fontSize: 12, fontWeight: 500, color: "var(--color-muted)", width: "100%",
        }}
      >
        {darkMode ? "\u2600\uFE0F" : "\uD83C\uDF19"} {darkMode ? "Light mode" : "Dark mode"}
      </button>
    </aside>
  );
}
```

- [ ] **Step 2: Import and render in Hub.jsx**

Add import at the top of Hub.jsx (after line 13):
```js
import DesktopSidebar from '../components/DesktopSidebar';
```

In the return JSX, after the pull-to-refresh indicator div (line ~220) and BEFORE the `<div className="app-main">` wrapper added in Task 3, add:

```jsx
<DesktopSidebar
  tab={tab} onChangeTab={handleChangeTab}
  filter={filter} setFilter={setFilter}
  kids={kids} members={members} weekEvts={weekEvts}
  darkMode={darkMode} setDarkMode={setDarkMode}
  showProfile={showProfile} setShowProfile={setShowProfile}
  isAdmin={isAdmin} onShowFab={() => setShowFab(!showFab)}
/>
```

- [ ] **Step 3: Verify build**

Run: `cd C:/Users/dfay/oneclubview && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/DesktopSidebar.jsx src/pages/Hub.jsx
git commit -m "feat: desktop sidebar with nav, kid filter, next-up card"
```

---

## Chunk 4: WeekGrid 7-Column Mode

### Task 5: WeekGrid `columns` prop

**Files:**
- Modify: `src/components/hub/WeekGrid.jsx`

- [ ] **Step 1: Add `columns` prop to component signature**

On line 15, change:
```js
export default function WeekGrid({ weekDays, events, holidays, onTapEvent, onTapDay, kids }) {
```
to:
```js
export default function WeekGrid({ weekDays, events, holidays, onTapEvent, onTapDay, kids, columns = 4 }) {
```

- [ ] **Step 2: Make `pageDays` responsive to columns**

Find the `pageDays` computation (around line 24-25). It currently reads:
```js
const pageDays = page === 0 ? weekDays.slice(0, 4) : weekDays.slice(3, 7);
```

Replace with:
```js
const showAll = columns >= 7;
const pageDays = showAll ? weekDays : (page === 0 ? weekDays.slice(0, 4) : weekDays.slice(3, 7));
```

- [ ] **Step 3: Update all `gridTemplateColumns` to use `columns`**

There are three instances of `gridTemplateColumns: "repeat(4,1fr)"` in the file. Replace all three with:
```js
gridTemplateColumns: `repeat(${showAll ? 7 : 4},1fr)`
```

Use `replace_all` for this replacement.

- [ ] **Step 4: Conditionally hide swipe and pagination**

Find the swipe indicator section (the `<div>` with the chevrons and dots, starting around line ~160). Wrap the entire swipe indicator div with:
```jsx
{!showAll && (
  /* existing swipe indicator content */
)}
```

Also, disable the touch handlers on the outer container when `showAll` is true. Change the outer div (around line ~74):
```js
onTouchStart={onTouchStartHandler} onTouchEnd={onTouchEndHandler}
```
to:
```js
onTouchStart={showAll ? undefined : onTouchStartHandler} onTouchEnd={showAll ? undefined : onTouchEndHandler}
```

- [ ] **Step 5: Verify build**

Run: `cd C:/Users/dfay/oneclubview && npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/components/hub/WeekGrid.jsx
git commit -m "feat: WeekGrid 7-column mode via columns prop"
```

---

## Chunk 5: Tab Layouts

### Task 6: ScheduleTab two-column desktop layout

**Files:**
- Modify: `src/pages/tabs/ScheduleTab.jsx`

- [ ] **Step 1: Import `useIsDesktop` and pass columns to WeekGrid**

At the top of ScheduleTab.jsx, add:
```js
import { useIsDesktop } from '../../hooks/useIsDesktop';
```

Inside the component function, after the existing `useState` declarations, add:
```js
const isDesktop = useIsDesktop();
```

- [ ] **Step 2: Pass `columns` prop to WeekGrid**

Find the WeekGrid render (around line 263):
```jsx
{weekView === "grid" && <WeekGrid weekDays={wd} events={filtEvts} holidays={[...(holidays || []), ...(userHolidays || [])]} onTapEvent={handleTapEvent} kids={kids} />}
```

Add `columns={isDesktop ? 7 : 4}`:
```jsx
{weekView === "grid" && <WeekGrid weekDays={wd} events={filtEvts} holidays={[...(holidays || []), ...(userHolidays || [])]} onTapEvent={handleTapEvent} kids={kids} columns={isDesktop ? 7 : 4} />}
```

- [ ] **Step 3: Wrap grid view content in schedule-desktop layout**

When `weekView === "grid"` and `isDesktop`, wrap the WeekGrid and the selected day panel in a two-column layout.

Find the section around lines 262-127 where the grid view and the selected day panel render. Wrap them:

After the insight cards section (the IIFE that renders activity count, around line 87), add:
```jsx
<div className={isDesktop && weekView === "grid" ? "schedule-desktop" : ""}>
<div>
```

After the WeekGrid render (line ~263), close the left column and add the right column:
```jsx
</div>
{isDesktop && weekView === "grid" && <div className="schedule-desktop__detail">
```

And close it after the selected day panel (around line 127):
```jsx
</div>}
</div>
```

Note: This is the trickiest part — the selected day panel (lines 90-127) already renders conditionally. On desktop, move it into the right column. On mobile, it stays where it is (below the grid). The simplest approach is: render the day panel twice (once mobile, once desktop) with CSS show/hide, OR use the `isDesktop` flag to render it in the right location. Use the `isDesktop` flag approach.

- [ ] **Step 4: Verify build**

Run: `cd C:/Users/dfay/oneclubview && npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/pages/tabs/ScheduleTab.jsx
git commit -m "feat: ScheduleTab two-column layout on desktop"
```

---

### Task 7: OverviewTab two-column desktop layout

**Files:**
- Modify: `src/pages/tabs/OverviewTab.jsx`

- [ ] **Step 1: Wrap content sections in overview-grid**

In `src/pages/tabs/OverviewTab.jsx`, the return JSX (starting line 42) has a `<div>` containing:
1. AlertCallout (lines 46-60)
2. "This week" stats card (lines 63-83)
3. "Family" card (lines 86-110)
4. "Spend" card (lines 113-137)
5. "My Clubs" card (lines 140-165)

Replace the outer `<div>` on line 44 with:
```jsx
<div className="overview-grid">
```

Add `className="overview-full-width"` to the AlertCallout wrapper. Since AlertCallout is rendered directly (not in a wrapping div), wrap it:
```jsx
<div className="overview-full-width">
  <AlertCallout ... />
</div>
```

The grid will automatically flow the remaining cards into two columns on desktop:
- Left: "This week" stats, "Spend"
- Right: "Family", "My Clubs"

- [ ] **Step 2: Verify build**

Run: `cd C:/Users/dfay/oneclubview && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/pages/tabs/OverviewTab.jsx
git commit -m "feat: OverviewTab two-column grid on desktop"
```

---

## Chunk 6: Hover States + Final Verification

### Task 8: Add `card-hover` class to interactive cards

**Files:**
- Modify: `src/pages/tabs/OverviewTab.jsx` (stat cards, family card, clubs card)
- Modify: `src/pages/tabs/ScheduleTab.jsx` (event cards in list view)

- [ ] **Step 1: Add `card-hover` to OverviewTab cards**

In OverviewTab.jsx, the "This week" stats card (line 63), "Family" card (line 86), "Spend" card (line 113), and "My Clubs" card (line 140) all have `className="stagger-card"`. Add `card-hover` to each:

Change `className="stagger-card"` to `className="stagger-card card-hover"` on these four card wrapper divs.

- [ ] **Step 2: Add `card-hover` to ScheduleTab list view cards**

In ScheduleTab.jsx, the list view event cards (inside the `weekView === "list"` section, around line 291) have `className="stagger-card"`. Add `card-hover`:

Change `className="stagger-card"` to `className="stagger-card card-hover"` in the list view event cards.

- [ ] **Step 3: Verify build**

Run: `cd C:/Users/dfay/oneclubview && npm run build`

- [ ] **Step 4: Run tests**

Run: `cd C:/Users/dfay/oneclubview && npm test`
Expected: All 15 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/pages/tabs/OverviewTab.jsx src/pages/tabs/ScheduleTab.jsx
git commit -m "feat: card hover lift effect on desktop"
```

---

### Task 9: Final build + visual verification

- [ ] **Step 1: Full build**

Run: `cd C:/Users/dfay/oneclubview && npm run build`

- [ ] **Step 2: Run tests**

Run: `cd C:/Users/dfay/oneclubview && npm test`

- [ ] **Step 3: Visual checklist**

Start `npm run dev` and verify at different widths:

**Mobile (< 768px):**
- [ ] Bottom tab bar visible
- [ ] No sidebar
- [ ] FAB visible
- [ ] All content full width
- [ ] Tab transitions animate (slide left/right)

**Tablet (768-1024px):**
- [ ] Content centered at 720px max
- [ ] Bottom tab bar visible
- [ ] No sidebar
- [ ] FAB visible

**Desktop (> 1024px):**
- [ ] Sidebar visible with logo, kid filters, nav, next-up card, add button, dark mode
- [ ] Bottom tab bar hidden
- [ ] FAB hidden
- [ ] Schedule tab: 7-day grid, no pagination arrows
- [ ] Overview tab: two-column card layout
- [ ] Money tab: centered at 640px
- [ ] Explore tab: existing wide layout works
- [ ] Card hover lifts on desktop
- [ ] Settings button in sidebar opens overlay panel
- [ ] Tab transitions animate
- [ ] Dark mode toggle works from sidebar
