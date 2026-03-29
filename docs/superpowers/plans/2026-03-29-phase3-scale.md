# Phase 3 — Scale: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare OneClubView for a growth push: reduce bundle size via code splitting, add data caching to prevent redundant API calls, integrate Sentry for production error monitoring, and optimize for Lighthouse 90+ mobile score.

**Architecture:** Lazy-load tabs and heavy modals via React.lazy + Suspense. Add a simple timestamp-based cache layer to HubDataContext. Integrate Sentry SDK for error capture. Optimize Vite build config for chunking and source maps.

**Tech Stack:** React 19, Vite 8, @sentry/react, Vitest

---

## File Structure

### New files to create:
| File | Responsibility |
|------|---------------|
| `src/lib/cache.js` | Simple in-memory cache with TTL (stale-while-revalidate) |
| `src/lib/__tests__/cache.test.js` | Tests for cache module |

### Files to modify:
| File | Changes |
|------|---------|
| `vite.config.js` | Add manual chunks, source maps, chunk size config |
| `src/pages/Hub.jsx` | Lazy-load tab imports with React.lazy + Suspense |
| `src/contexts/HubDataContext.jsx` | Add cache layer to load() |
| `src/main.jsx` | Initialize Sentry |
| `src/components/ErrorBoundary.jsx` | Report errors to Sentry |
| `package.json` | Add @sentry/react dependency |
| `public/og-image.png` | Optimize image size |

---

## Task 1: Vite Build Optimization & Code Splitting Config

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Read current vite.config.js**

Read `vite.config.js` to see current config.

- [ ] **Step 2: Add build optimization config**

Update `vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-capacitor': [
            '@capacitor/core',
            '@capacitor/app',
            '@capacitor/haptics',
            '@capacitor/keyboard',
            '@capacitor/status-bar',
            '@capacitor/splash-screen',
            '@capacitor/push-notifications',
          ],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
```

This splits the bundle into:
- `vendor-react` (~140 KB) — React + ReactDOM
- `vendor-supabase` (~50 KB) — Supabase client
- `vendor-capacitor` (~100 KB) — Native plugins
- `index` (~200 KB) — App code (will shrink further with lazy loading in Task 2)

- [ ] **Step 3: Build and verify chunk sizes**

```bash
npm run build
```

Expected: Multiple chunks instead of one 502 KB chunk. No chunk over 300 KB.

- [ ] **Step 4: Commit**

```bash
git add vite.config.js
git commit -m "perf: add Vite code splitting with manual chunks and source maps"
```

---

## Task 2: Lazy-Load Tabs and Heavy Modals

**Files:**
- Modify: `src/pages/Hub.jsx`

- [ ] **Step 1: Read current Hub.jsx imports**

Read the top of `src/pages/Hub.jsx` to see current static imports for tabs and modals.

- [ ] **Step 2: Convert tab imports to React.lazy**

Replace the static tab imports with lazy imports:

```jsx
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';

// Lazy-loaded tabs
const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const ScheduleTab = lazy(() => import('./tabs/ScheduleTab'));
const MoneyTab = lazy(() => import('./tabs/MoneyTab'));
const ExploreTab = lazy(() => import('./tabs/ExploreTab'));
const SettingsTab = lazy(() => import('./tabs/SettingsTab'));

// Lazy-loaded heavy modals
const PasteScheduleModal = lazy(() => import('../components/modals/PasteScheduleModal'));
const AddActivityModal = lazy(() => import('../components/modals/AddActivityModal'));
const AddKidModal = lazy(() => import('../components/modals/AddKidModal'));
```

Keep small/frequently-used modals as static imports (AddEventModal, AddPaymentModal, AddPlaydateModal).

- [ ] **Step 3: Wrap tab rendering in Suspense**

Find where tabs are rendered in Hub.jsx (the tab content section) and wrap in Suspense with a minimal fallback:

```jsx
<Suspense fallback={<div style={{ padding: '20px 0' }}>
  <div className="skeleton-shimmer" style={{ height: 200, borderRadius: 16 }} />
</div>}>
  {tab === "overview" && <OverviewTab filter={filter} onChangeTab={handleChangeTab} onRefresh={onRefresh} />}
  {tab === "week" && <ScheduleTab filter={filter} />}
  {tab === "money" && <MoneyTab filter={filter} />}
  {tab === "explore" && <ExploreTab filter={filter} onRefresh={onRefresh} />}
</Suspense>
```

Also wrap lazy-loaded modals in Suspense:

```jsx
<Suspense fallback={null}>
  {showPaste && <PasteScheduleModal ... />}
  {showAddActivity && <AddActivityModal ... />}
  {showAddKid && <AddKidModal ... />}
</Suspense>
```

And wrap the SettingsTab render similarly:

```jsx
{showProfile && <Suspense fallback={null}><SettingsTab ... /></Suspense>}
```

- [ ] **Step 4: Build and verify chunks**

```bash
npm run build
```

Expected: Tab chunks appear as separate files. Main chunk size reduced.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Hub.jsx
git commit -m "perf: lazy-load tabs and heavy modals with React.lazy + Suspense"
```

---

## Task 3: Data Caching Layer

**Files:**
- Create: `src/lib/cache.js`
- Create: `src/lib/__tests__/cache.test.js`
- Modify: `src/contexts/HubDataContext.jsx`

- [ ] **Step 1: Create the cache module**

Create `src/lib/cache.js`:

```js
const store = new Map();

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function cacheSet(key, data, ttlMs) {
  store.set(key, { data, expiry: Date.now() + ttlMs });
}

export function cacheInvalidate(key) {
  if (key) store.delete(key);
  else store.clear();
}
```

- [ ] **Step 2: Write tests for the cache**

Create `src/lib/__tests__/cache.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheGet, cacheSet, cacheInvalidate } from '../cache';

describe('cache', () => {
  beforeEach(() => {
    cacheInvalidate(); // clear all
  });

  it('returns null for missing key', () => {
    expect(cacheGet('nope')).toBeNull();
  });

  it('stores and retrieves data', () => {
    cacheSet('users', [{ id: 1 }], 60000);
    expect(cacheGet('users')).toEqual([{ id: 1 }]);
  });

  it('returns null for expired data', () => {
    cacheSet('old', 'data', 1); // 1ms TTL
    vi.advanceTimersByTime(10);
    // Use real timing — cache checks Date.now()
    return new Promise(resolve => setTimeout(() => {
      expect(cacheGet('old')).toBeNull();
      resolve();
    }, 10));
  });

  it('invalidates specific key', () => {
    cacheSet('a', 1, 60000);
    cacheSet('b', 2, 60000);
    cacheInvalidate('a');
    expect(cacheGet('a')).toBeNull();
    expect(cacheGet('b')).toBe(2);
  });

  it('invalidates all keys', () => {
    cacheSet('a', 1, 60000);
    cacheSet('b', 2, 60000);
    cacheInvalidate();
    expect(cacheGet('a')).toBeNull();
    expect(cacheGet('b')).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: All cache tests pass.

- [ ] **Step 4: Add caching to HubDataContext load()**

In `src/contexts/HubDataContext.jsx`, import the cache and use it in load():

```js
import { cacheGet, cacheSet, cacheInvalidate } from '../lib/cache';
```

At the top of `load()`, check cache for static data (camps, schools, activity_categories):

```js
const load = useCallback(async () => {
  try {
    // Check cache for static data (5 min TTL)
    const cachedCamps = cacheGet('camps');
    const cachedActCats = cacheGet('actCats');

    // ... existing profile/family fetch logic stays the same ...

    const [k, c, r, m, p, ca, hols, userHols, cBooks, lEvts, aCats] = await Promise.all([
      db('dependants', 'GET', { ... }),
      db('hub_subscriptions', 'GET', { ... }),
      db('recurring_events', 'GET', { ... }),
      db('manual_events', 'GET', { ... }),
      db('payment_reminders', 'GET', { ... }),
      cachedCamps || db('camps', 'GET', { ... }),  // Use cache if available
      db('school_holidays', 'GET', { ... }),
      db('user_school_holidays', 'GET', { ... }),
      db('camp_bookings', 'GET', { ... }),
      db('local_events', 'GET', { ... }),
      cachedActCats || db('activity_categories', 'GET', { ... }),  // Use cache if available
    ]);

    // Cache static data
    if (!cachedCamps && ca) cacheSet('camps', ca, 300000); // 5 min
    if (!cachedActCats && aCats) cacheSet('actCats', aCats, 300000); // 5 min

    // ... rest of load() unchanged ...
  }
}, [user.id, profile?.family_id]);
```

This caches camps and activity_categories (which rarely change) for 5 minutes. User-specific data (events, payments, kids) is always fetched fresh.

- [ ] **Step 5: Verify build and tests**

```bash
npm run build && npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/cache.js src/lib/__tests__/cache.test.js src/contexts/HubDataContext.jsx
git commit -m "perf: add data caching layer — cache camps and categories for 5 min"
```

---

## Task 4: Sentry Error Monitoring

**Files:**
- Modify: `package.json`
- Modify: `src/main.jsx`
- Modify: `src/components/ErrorBoundary.jsx`

- [ ] **Step 1: Install Sentry**

```bash
npm install @sentry/react
```

- [ ] **Step 2: Initialize Sentry in main.jsx**

Read `src/main.jsx` first, then add Sentry init before the React render:

```jsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: "https://YOUR_DSN_HERE@o0.ingest.sentry.io/0", // placeholder — Dave sets this
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD, // only in production
  tracesSampleRate: 0.1, // 10% of transactions for performance
  replaysSessionSampleRate: 0, // no replays (saves quota)
  replaysOnErrorSampleRate: 0,
});
```

**Note:** The DSN is a placeholder. Dave needs to create a Sentry project at https://sentry.io and replace the DSN. Sentry is disabled in dev mode via `enabled: import.meta.env.PROD`.

- [ ] **Step 3: Report errors from ErrorBoundary to Sentry**

In `src/components/ErrorBoundary.jsx`, add Sentry error reporting in `componentDidCatch`:

```jsx
import * as Sentry from '@sentry/react';

// In componentDidCatch:
componentDidCatch(error, info) {
  console.error('ErrorBoundary caught:', error, info.componentStack);
  Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds. Sentry adds ~15 KB gzipped to vendor chunk.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/main.jsx src/components/ErrorBoundary.jsx
git commit -m "feat: add Sentry error monitoring (disabled in dev, captures in prod)"
```

---

## Task 5: Lighthouse Performance Optimization

**Files:**
- Modify: `public/og-image.png` (optimize)
- Modify: `public/index.html` (if meta tags need fixing)
- Modify: `src/lib/global.css` (remove any unused styles)

- [ ] **Step 1: Optimize og-image.png**

Convert the 23 KB og-image.png to a smaller format or compress it:

```bash
# If imagemagick is available
convert public/og-image.png -quality 80 -resize 1200x630 public/og-image.png
```

Or use an online tool to compress to ~10-12 KB. The image should be 1200x630px for proper OG display.

- [ ] **Step 2: Check index.html meta tags for Lighthouse**

Read `public/index.html` (or the Vite entry `index.html`) and verify:
- `<meta name="viewport">` is present
- `<meta name="description">` is present
- `<meta name="theme-color">` is present
- Font preload hints for Fraunces and Plus Jakarta Sans

If any are missing, add them.

- [ ] **Step 3: Add font preload to index.html**

Add preload links for the critical fonts in the `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

Verify these already exist. If fonts are loaded via a `<link>` tag, add `display=swap` if not present.

- [ ] **Step 4: Remove unused CSS**

Check `src/lib/global.css` for the `@keyframes cardSlideIn` animation — the exploration found it may be unused. If `.stagger-card` doesn't reference it, remove the keyframes definition.

- [ ] **Step 5: Build and check sizes**

```bash
npm run build
```

Note final chunk sizes for comparison.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "perf: Lighthouse optimizations — compress og-image, font preload, clean CSS"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Note the chunk breakdown. Expected:
- vendor-react: ~140 KB
- vendor-supabase: ~50 KB
- vendor-capacitor: ~80-100 KB
- index (app code): <200 KB
- Lazy tab chunks: ~20-40 KB each

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

1. Landing page loads fast (no full bundle needed)
2. Login → Hub loads with skeleton → tabs render
3. Switch between all tabs — verify lazy loading doesn't cause visible delay
4. Open a modal — verify it loads without flicker
5. Toggle dark mode — still works everywhere
6. Check browser DevTools Network tab — verify separate chunk files load on demand

- [ ] **Step 4: Commit if cleanup needed**

```bash
git add -A
git commit -m "chore: Phase 3 Scale complete"
```
