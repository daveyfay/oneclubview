# Phase 1 — Foundation: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose Hub.jsx from a 1,492-line god component into focused tab components with shared state via React Context, rename CSS variables to semantic names, add testing infrastructure, and add error boundaries.

**Architecture:** Hub.jsx becomes a thin shell (~200 lines) that renders tab components. Shared data lives in a `HubDataProvider` context with custom hooks. Each tab component owns its own UI state (modals, local toggles) while consuming shared data from context. CSS variables and class names are renamed project-wide to semantic names.

**Tech Stack:** React 19, Vite 8, Vitest, React Testing Library, Supabase PostgREST

---

## File Structure

### New files to create:
| File | Responsibility |
|------|---------------|
| `src/contexts/HubDataContext.jsx` | React Context provider — owns all Supabase data fetching, exposes shared state + actions via hooks |
| `src/hooks/useHubData.js` | Custom hook to consume HubDataContext |
| `src/pages/tabs/OverviewTab.jsx` | Overview tab UI — stats tiles, quick actions, alerts |
| `src/pages/tabs/ScheduleTab.jsx` | Schedule tab UI — week grid, calendar, timeline |
| `src/pages/tabs/MoneyTab.jsx` | Money tab UI — payment tracking, mark paid |
| `src/pages/tabs/ExploreTab.jsx` | Explore tab UI — clubs, camps, discover subtabs |
| `src/pages/tabs/SettingsTab.jsx` | Settings tab UI — profile, family, account management |
| `src/components/ErrorBoundary.jsx` | Error boundary with recovery UI |
| `src/lib/__tests__/supabase.test.js` | Tests for supabase.js helpers |
| `src/contexts/__tests__/HubDataContext.test.jsx` | Tests for data context/hooks |
| `vitest.config.js` | Vitest configuration |
| `src/test-setup.js` | Test setup file (jsdom, cleanup) |

### Files to modify:
| File | Changes |
|------|---------|
| `src/pages/Hub.jsx` | Gut to ~200-line shell — tab routing, header, FAB, wraps children in HubDataProvider |
| `src/lib/global.css` | Rename all CSS variables and class names to semantic names |
| `src/App.jsx` | Wrap Hub in ErrorBoundary |
| `src/pages/Landing.jsx` | Update CSS variable/class references |
| `src/pages/Auth.jsx` | Update CSS variable/class references |
| `src/pages/OnboardKids.jsx` | Update CSS variable/class references |
| `src/pages/OnboardClubs.jsx` | Update CSS variable/class references |
| `src/pages/AdminDashboard.jsx` | Update CSS variable/class references |
| `src/components/modals/*.jsx` | Update CSS variable/class references (all modals) |
| `src/components/hub/*.jsx` | Update CSS variable/class references |
| `package.json` | Add vitest, @testing-library/react, @testing-library/jest-dom, jsdom |
| `.gitignore` | Add `.superpowers/` |

---

## Task 1: Add .superpowers/ to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .superpowers/ to .gitignore**

Add this line to the end of `.gitignore`:

```
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers/ to gitignore"
```

---

## Task 2: Install Testing Infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/test-setup.js`

- [ ] **Step 1: Install test dependencies**

```bash
cd ~/Desktop/oneclubview
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create vitest.config.js**

Create `vitest.config.js` in project root:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    globals: true,
  },
});
```

- [ ] **Step 3: Create test setup file**

Create `src/test-setup.js`:

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Add test script to package.json**

Add to `scripts` in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a smoke test to verify setup**

Create `src/lib/__tests__/supabase.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('supabase helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('module imports without error', async () => {
    const mod = await import('../supabase.js');
    expect(mod.db).toBeDefined();
    expect(mod.au).toBeDefined();
    expect(mod.rpc).toBeDefined();
    expect(mod.hd).toBeDefined();
  });

  it('hd() returns headers with apikey', async () => {
    const { hd } = await import('../supabase.js');
    const headers = hd();
    expect(headers.apikey).toBeTruthy();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toContain('Bearer ');
  });

  it('db() blocks DELETE without filters', async () => {
    const { db } = await import('../supabase.js');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await db('test_table', 'DELETE');
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('db() DELETE blocked — no filters');
    consoleSpy.mockRestore();
  });

  it('db() makes GET request with correct URL', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify([{ id: 1 }])),
    });

    const { db, SB } = await import('../supabase.js');
    const result = await db('profiles', 'GET', {
      filters: ['id=eq.123'],
      select: 'id,email',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callUrl = global.fetch.mock.calls[0][0];
    expect(callUrl).toContain('/rest/v1/profiles');
    expect(callUrl).toContain('select=');
    expect(callUrl).toContain('id=eq.123');
    expect(result).toEqual([{ id: 1 }]);
  });
});
```

- [ ] **Step 6: Run tests to verify setup**

```bash
npm test
```

Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.js src/test-setup.js src/lib/__tests__/supabase.test.js package.json package-lock.json
git commit -m "chore: add Vitest testing infrastructure with supabase smoke tests"
```

---

## Task 3: Create ErrorBoundary Component

**Files:**
- Create: `src/components/ErrorBoundary.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create ErrorBoundary component**

Create `src/components/ErrorBoundary.jsx`:

```jsx
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--warm, #f8f6f3)',
          fontFamily: 'var(--sn, "Plus Jakarta Sans", sans-serif)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😵</div>
          <h2 style={{
            fontFamily: 'var(--sr, "Fraunces", serif)',
            fontSize: '22px',
            color: 'var(--tx, #1a1a1a)',
            marginBottom: '8px',
          }}>
            Something went wrong
          </h2>
          <p style={{
            color: 'var(--mt, #7c8590)',
            fontSize: '14px',
            marginBottom: '24px',
            maxWidth: '320px',
          }}>
            {this.props.label
              ? `The ${this.props.label} section hit a snag.`
              : "The app hit a snag. Your data is safe."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            style={{
              padding: '14px 32px',
              borderRadius: '16px',
              border: 'none',
              background: 'var(--g, #1a2a3a)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'var(--sn, "Plus Jakarta Sans", sans-serif)',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

- [ ] **Step 2: Wrap Hub in App.jsx with ErrorBoundary**

In `src/App.jsx`, add the import at the top with the other imports:

```jsx
import ErrorBoundary from './components/ErrorBoundary';
```

Then wrap the Hub render (line ~132) from:

```jsx
if (screen === "hub" || screen === "hub_force") return <Hub user={user} profile={profile} onRefresh={(s) => { if (s === "clubs") setScreen("onboard_clubs"); }} onLogout={logout} />;
```

to:

```jsx
if (screen === "hub" || screen === "hub_force") return <ErrorBoundary><Hub user={user} profile={profile} onRefresh={(s) => { if (s === "clubs") setScreen("onboard_clubs"); }} onLogout={logout} /></ErrorBoundary>;
```

- [ ] **Step 3: Verify the app still builds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ErrorBoundary.jsx src/App.jsx
git commit -m "feat: add ErrorBoundary component with recovery UI"
```

---

## Task 4: Create HubDataContext — The Shared Data Layer

This is the most critical task. It extracts all data fetching and shared state from Hub.jsx into a React Context.

**Files:**
- Create: `src/contexts/HubDataContext.jsx`
- Create: `src/hooks/useHubData.js`

- [ ] **Step 1: Create HubDataContext**

Create `src/contexts/HubDataContext.jsx`:

```jsx
import React, { createContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, rpc, SB, hd } from '../lib/supabase';
import { getAge, weekDates, calcKm, fmtDist } from '../lib/utils';
import { COLS } from '../lib/constants';

export const HubDataContext = createContext(null);

export function HubDataProvider({ user, profile, children }) {
  // ── Core data ──
  const [kids, setKids] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [recs, setRecs] = useState([]);
  const [mans, setMans] = useState([]);
  const [pays, setPays] = useState([]);
  const [camps, setCamps] = useState([]);
  const [campBookings, setCampBookings] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [userHolidays, setUserHolidays] = useState([]);
  const [schoolLocs, setSchoolLocs] = useState([]);
  const [familyLocs, setFamilyLocs] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [localEvents, setLocalEvents] = useState([]);
  const [actCats, setActCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);

  const isAdmin = profile?.family_role === 'admin';

  // ── Data loading ──
  const load = useCallback(async () => {
    try {
      const freshProfile = await db('profiles', 'GET', { filters: ['id=eq.' + user.id] });
      const myFamilyId = freshProfile?.[0]?.family_id || profile?.family_id;
      let famIds = [user.id];
      if (myFamilyId) {
        const famMembers = await db('profiles', 'GET', {
          filters: ['family_id=eq.' + myFamilyId],
          select: 'id,first_name,email,subscription_status,is_beta,family_role',
        });
        if (famMembers) {
          famIds = famMembers.map(m => m.id);
          setFamilyMembers(famMembers);
        }
      }
      const uidFilter = famIds.length > 1
        ? 'user_id=in.(' + famIds.join(',') + ')'
        : 'user_id=eq.' + user.id;
      const pidFilter = famIds.length > 1
        ? 'parent_user_id=in.(' + famIds.join(',') + ')'
        : 'parent_user_id=eq.' + user.id;

      setLoading(true);
      const [k, c, r, m, p, ca, hols, userHols, cBooks, lEvts, aCats] = await Promise.all([
        db('dependants', 'GET', { filters: [pidFilter], order: 'created_at.asc' }),
        db('hub_subscriptions', 'GET', {
          select: 'id,club_id,dependant_id,colour,nickname,clubs(id,name,address,location,phone,rating,term_start,term_end)',
          filters: [uidFilter],
        }),
        db('recurring_events', 'GET', { filters: [uidFilter] }),
        db('manual_events', 'GET', { filters: [uidFilter] }),
        db('payment_reminders', 'GET', { filters: [uidFilter], order: 'due_date.asc' }),
        db('camps', 'GET', {
          select: 'id,title,camp_type,start_date,end_date,daily_start_time,daily_end_time,age_min,age_max,cost_eur,cost_notes,location_name,latitude,longitude,booking_url,source',
          filters: ['status=eq.active'],
          order: 'start_date.asc',
        }),
        db('school_holidays', 'GET', { order: 'start_date.asc' }),
        db('user_school_holidays', 'GET', { filters: [uidFilter], order: 'start_date.asc' }),
        db('camp_bookings', 'GET', { filters: [uidFilter] }),
        db('local_events', 'GET', { select: '*,category', order: 'event_date.asc' }),
        db('activity_categories', 'GET', { order: 'name.asc' }),
      ]);

      setKids(k || []);

      // Fetch school coordinates
      const kidSchools = (k || []).filter(kid => kid.school_name).map(kid => kid.school_name);
      if (kidSchools.length > 0) {
        const uniqueSchools = [...new Set(kidSchools)];
        const schoolQ = uniqueSchools.map(s => "name.ilike.*" + encodeURIComponent(s.replace(/'/g, "''")) + "*").join(",");
        const sch = await db('schools', 'GET', {
          select: 'name,latitude,longitude',
          filters: ['or=(' + schoolQ + ')', 'latitude=not.is.null'],
          limit: 20,
        });
        setSchoolLocs((sch || []).filter(s => s.latitude).map(s => ({
          lat: Number(s.latitude), lng: Number(s.longitude), name: s.name,
        })));
      }

      setClubs((c || []).map(s => ({
        ...s,
        club_id: s.club_id || s.clubs?.id,
        club_name: s.clubs?.name || '?',
        club_addr: s.clubs?.address,
        term_start: s.clubs?.term_start || null,
        term_end: s.clubs?.term_end || null,
      })));
      setRecs(r || []);
      setMans(m || []);
      setPays(p || []);
      setCamps(ca || []);
      setHolidays(hols || []);
      setUserHolidays(userHols || []);
      setCampBookings(cBooks || []);
      setLocalEvents(lEvts || []);
      setActCats(aCats || []);

      // Load family locations
      const fLocs = await db('family_locations', 'GET', {
        filters: ['user_id=eq.' + user.id, 'active=eq.true'],
        order: 'label.asc',
      });
      setFamilyLocs(fLocs || []);

      // Auto-add school locations if not already saved
      if (kidSchools.length > 0) {
        const uniqueSchools2 = [...new Set(kidSchools)];
        const schoolQ2 = uniqueSchools2.map(s => "name.ilike.*" + encodeURIComponent(s.replace(/'/g, "''")) + "*").join(",");
        const sch2 = await db('schools', 'GET', {
          select: 'name,latitude,longitude',
          filters: ['or=(' + schoolQ2 + ')', 'latitude=not.is.null'],
          limit: 20,
        });
        const newSchLocs = (sch2 || []).filter(s => s.latitude).map(s => ({
          lat: Number(s.latitude), lng: Number(s.longitude), name: s.name,
        }));
        setSchoolLocs(newSchLocs);
        const toInsert = newSchLocs.filter(sl =>
          !(fLocs || []).find(fl => fl.label.includes('School') && Math.abs(Number(fl.latitude) - sl.lat) < 0.01)
        );
        if (toInsert.length > 0) {
          await Promise.all(toInsert.map(sl =>
            db('family_locations', 'POST', {
              body: {
                user_id: user.id, label: '🏫 ' + sl.name,
                latitude: sl.lat, longitude: sl.lng, radius_km: 10,
                auto_source: 'school', active: true,
              },
            })
          ));
          const fLocs2 = await db('family_locations', 'GET', {
            filters: ['user_id=eq.' + user.id, 'active=eq.true'],
            order: 'label.asc',
          });
          setFamilyLocs(fLocs2 || []);
        }
      }

      setLoading(false);

      // Notifications (fire after main data)
      const notifs = await db('inbound_messages', 'GET', {
        filters: ['user_id=eq.' + user.id],
        order: 'created_at.desc',
        limit: 10,
      });
      setNotifications(notifs || []);

      // Update last active (fire-and-forget)
      db('profiles', 'PATCH', {
        body: { last_active_at: new Date().toISOString() },
        filters: ['id=eq.' + user.id],
      }).catch(e => console.error('last_active update failed:', e));
    } catch (err) {
      console.error('Hub load() failed:', err);
      setLoading(false);
    }
  }, [user.id, profile?.family_id]);

  // Initial load + geolocation
  useEffect(() => {
    load();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(loc);
          db('profiles', 'PATCH', {
            filters: ['id=eq.' + user.id],
            body: { latitude: loc.lat, longitude: loc.lng },
          }).catch(e => console.error('Profile location update failed:', e));
          rpc('needs_scrape', { lat: loc.lat, lng: loc.lng }).then(needed => {
            if (needed) {
              fetch(SB + '/functions/v1/scrape-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: loc.lat, longitude: loc.lng, user_id: user.id }),
              }).then(r => r.json()).then(d => { if (d.status === 'success') load(); })
                .catch(e => console.error('Scrape failed:', e));
            }
          }).catch(e => console.error('needs_scrape check failed:', e));
        },
        () => {
          db('profiles', 'GET', { filters: ['id=eq.' + user.id], select: 'latitude,longitude' })
            .then(p => {
              if (p?.[0]?.latitude) {
                setUserLoc({ lat: Number(p[0].latitude), lng: Number(p[0].longitude) });
              }
            }).catch(e => console.error('Profile location fallback failed:', e));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [load]);

  // Scrape new family location areas
  const familyLocsKey = useMemo(
    () => familyLocs.map(fl => fl.id + ':' + fl.latitude + ':' + fl.longitude).join('|'),
    [familyLocs]
  );
  useEffect(() => {
    if (familyLocs.length === 0) return;
    familyLocs.forEach(fl => {
      rpc('needs_scrape', { lat: Number(fl.latitude), lng: Number(fl.longitude) })
        .then(needed => {
          if (needed) {
            fetch(SB + '/functions/v1/scrape-local', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude: Number(fl.latitude), longitude: Number(fl.longitude) }),
            }).then(r => r.json()).then(d => { if (d.status === 'success') load(); })
              .catch(e => console.error('Family loc scrape failed:', e));
          }
        }).catch(e => console.error('needs_scrape check failed:', e));
    });
  }, [familyLocsKey, load]);

  // ── Computed state ──
  const members = useMemo(() => {
    const m = [{ id: 'all', name: 'Everyone', emoji: '👨‍👩‍👧‍👦', type: 'all' }];
    kids.forEach(k => m.push({
      id: k.id, name: k.first_name, emoji: '👧', type: 'kid',
      age: getAge(k.date_of_birth), dob: k.date_of_birth,
    }));
    m.push({ id: 'self', name: profile?.first_name || 'Me', emoji: '👤', type: 'self' });
    familyMembers.filter(fm => fm.id !== user.id).forEach(fm =>
      m.push({ id: fm.id, name: fm.first_name || fm.email, emoji: '👤', type: 'adult' })
    );
    return m;
  }, [kids, profile, familyMembers, user.id]);

  const wd = useMemo(() => weekDates(), []);
  const clubMap = useMemo(() => { const m = new Map(); clubs.forEach(c => m.set(c.club_id, c)); return m; }, [clubs]);
  const clubTermMap = useMemo(() => {
    const m = new Map();
    clubs.forEach(c => {
      if (c.term_start && c.term_end) {
        m.set(c.club_id, { start: new Date(c.term_start + 'T00:00:00'), end: new Date(c.term_end + 'T23:59:59') });
      }
    });
    return m;
  }, [clubs]);
  const kidMap = useMemo(() => { const m = new Map(); kids.forEach(k => m.set(k.id, k)); return m; }, [kids]);

  const getMemberCol = useCallback((memberId) => {
    if (!memberId || memberId === 'self') return 'var(--g)';
    const idx = kids.findIndex(k => k.id === memberId);
    return idx >= 0 ? COLS[idx % COLS.length] : 'var(--g)';
  }, [kids]);

  // ── Context value ──
  const value = useMemo(() => ({
    // Raw data
    kids, clubs, recs, mans, pays, camps, campBookings,
    holidays, userHolidays, schoolLocs, familyLocs,
    familyMembers, notifications, localEvents, actCats,
    loading, userLoc, isAdmin,
    // Computed
    members, wd, clubMap, clubTermMap, kidMap,
    // Actions
    load, getMemberCol,
    // Setters (for modals that need to update state after save)
    setFamilyLocs, setCampBookings,
    // User info
    user, profile,
  }), [
    kids, clubs, recs, mans, pays, camps, campBookings,
    holidays, userHolidays, schoolLocs, familyLocs,
    familyMembers, notifications, localEvents, actCats,
    loading, userLoc, isAdmin,
    members, wd, clubMap, clubTermMap, kidMap,
    load, getMemberCol, user, profile,
  ]);

  return (
    <HubDataContext.Provider value={value}>
      {children}
    </HubDataContext.Provider>
  );
}
```

- [ ] **Step 2: Create useHubData hook**

Create `src/hooks/useHubData.js`:

```js
import { useContext } from 'react';
import { HubDataContext } from '../contexts/HubDataContext';

export function useHubData() {
  const ctx = useContext(HubDataContext);
  if (!ctx) throw new Error('useHubData must be used within HubDataProvider');
  return ctx;
}
```

- [ ] **Step 3: Verify the files build**

```bash
npm run build
```

Expected: Build succeeds. The context isn't used yet, but it should compile.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/HubDataContext.jsx src/hooks/useHubData.js
git commit -m "feat: create HubDataContext with shared data layer and useHubData hook"
```

---

## Task 5: Extract Tab Components from Hub.jsx

This task creates the 5 tab components and rewires Hub.jsx to use them. Each tab component consumes data from `useHubData()` and owns its own modal/UI state.

**This is a large extraction task.** The approach is:
1. Create each tab component by moving the relevant JSX and local state from Hub.jsx
2. Each tab imports `useHubData` for shared data
3. Each tab owns its modal show/hide state
4. Hub.jsx becomes the shell: provider + header + tabs + FAB

**Files:**
- Create: `src/pages/tabs/OverviewTab.jsx`
- Create: `src/pages/tabs/ScheduleTab.jsx`
- Create: `src/pages/tabs/MoneyTab.jsx`
- Create: `src/pages/tabs/ExploreTab.jsx`
- Create: `src/pages/tabs/SettingsTab.jsx`
- Modify: `src/pages/Hub.jsx`

- [ ] **Step 1: Create the tabs directory**

```bash
mkdir -p ~/Desktop/oneclubview/src/pages/tabs
```

- [ ] **Step 2: Create OverviewTab.jsx**

Create `src/pages/tabs/OverviewTab.jsx`. This component renders the overview stats tiles and quick actions. Extract the Overview tab JSX from Hub.jsx (the section rendered when `tab === "overview"`).

The component should:
- Import `useHubData` for shared data (kids, clubs, pays, camps, userLoc, etc.)
- Own its local modal state (showAddKid, showAddEv, etc.)
- Import the modal components it uses directly
- Include the ErrorBoundary wrapper for its own section

**Key pattern for all tabs:**

```jsx
import React, { useState } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
// ... tab-specific modal imports

export default function OverviewTab({ onChangeTab }) {
  const { kids, clubs, pays, camps, userLoc, members, load, user, profile, isAdmin } = useHubData();
  // Local modal state
  const [showAddKid, setShowAddKid] = useState(false);
  // ... rest of modal state for this tab

  return (
    <ErrorBoundary label="Overview">
      {/* Overview tab JSX extracted from Hub.jsx */}
    </ErrorBoundary>
  );
}
```

Move the entire Overview tab rendering block from Hub.jsx into this component. This includes:
- Stats tiles (Kids count, Clubs count, Upcoming events, Fees due)
- Tappable stat tiles that navigate to other tabs via `onChangeTab`
- Smart alerts section
- The Overview-specific modals (AddKidModal when triggered from Overview)

- [ ] **Step 3: Create ScheduleTab.jsx**

Create `src/pages/tabs/ScheduleTab.jsx`. This is the most complex tab — it owns:
- `weekView` state (grid/list/calendar)
- `selectedDay`, `calMonth`, `calYear` state
- `weekEvts` and `filtEvts` computed values (move the useMemo from Hub)
- `filter` state for member filtering
- WeekGrid component rendering
- Calendar month view rendering
- Timeline/list view rendering
- EventDetailModal, AddEventModal, PasteScheduleModal

```jsx
import React, { useState, useMemo } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import WeekGrid from '../../components/hub/WeekGrid';
import AddEventModal from '../../components/modals/AddEventModal';
import PasteScheduleModal from '../../components/modals/PasteScheduleModal';
import EventDetailModal from '../../components/modals/EventDetailModal';
// ... other imports

export default function ScheduleTab({ filter }) {
  const {
    recs, mans, pays, clubs, kids, holidays, userHolidays,
    clubMap, clubTermMap, kidMap, wd, load, user, profile, getMemberCol,
  } = useHubData();

  const [weekView, setWeekView] = useState('grid');
  const [selectedDay, setSelectedDay] = useState(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [showAddEv, setShowAddEv] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [tapEvent, setTapEvent] = useState(null);

  // Move weekEvts useMemo here from Hub.jsx
  // Move filtEvts useMemo here (filtered by filter prop)
  // Move calendar month events computation here

  return (
    <ErrorBoundary label="Schedule">
      {/* Schedule tab JSX extracted from Hub.jsx */}
    </ErrorBoundary>
  );
}
```

- [ ] **Step 4: Create MoneyTab.jsx**

Create `src/pages/tabs/MoneyTab.jsx`. This tab owns:
- Payment display and filtering
- Mark paid / Not renewing / Delete inline actions (direct db calls)
- AddPaymentModal
- `filtPays` computed value

```jsx
import React, { useState, useMemo } from 'react';
import { db } from '../../lib/supabase';
import { showToast } from '../../lib/utils';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import AddPaymentModal from '../../components/modals/AddPaymentModal';

export default function MoneyTab({ filter }) {
  const { pays, clubs, kids, load, user, profile, isAdmin, clubMap } = useHubData();
  const [showAddPay, setShowAddPay] = useState(false);

  // Move filtPays useMemo here
  // Move payment action handlers here (markPaid, markNotRenewing, deletePay)

  return (
    <ErrorBoundary label="Money">
      {/* Money tab JSX extracted from Hub.jsx */}
    </ErrorBoundary>
  );
}
```

- [ ] **Step 5: Create ExploreTab.jsx**

Create `src/pages/tabs/ExploreTab.jsx`. This tab owns:
- `exploreTab` state (clubs/camps/discover subtabs)
- `campLoc` state
- Camp filtering (filtCamps useMemo)
- Location management (showSaveLocModal, showAddLocModal)
- EditClubModal, AddActivityModal, AddPlaydateModal
- NearbyClubsSection, ThingsToDoSection, CampCard components

```jsx
import React, { useState, useMemo } from 'react';
import { db } from '../../lib/supabase';
import { calcKm, fmtDist, showToast } from '../../lib/utils';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import CampCard from '../../components/hub/CampCard';
import NearbyClubsSection from '../../components/hub/NearbyClubsSection';
import ThingsToDoSection from '../../components/hub/ThingsToDoSection';
import EditClubModal from '../../components/modals/EditClubModal';
import AddActivityModal from '../../components/modals/AddActivityModal';
import AddPlaydateModal from '../../components/modals/AddPlaydateModal';

export default function ExploreTab({ filter }) {
  const {
    clubs, camps, campBookings, kids, userLoc, familyLocs, schoolLocs,
    localEvents, actCats, load, user, profile, isAdmin, setFamilyLocs, setCampBookings,
  } = useHubData();

  const [exploreTab, setExploreTab] = useState('clubs');
  const [campLoc, setCampLoc] = useState('all');
  const [editClub, setEditClub] = useState(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddPlaydate, setShowAddPlaydate] = useState(false);
  const [showSaveLocModal, setShowSaveLocModal] = useState(false);
  const [showAddLocModal, setShowAddLocModal] = useState(false);

  // Move filtCamps, allLocs useMemos here

  return (
    <ErrorBoundary label="Explore">
      {/* Explore tab JSX extracted from Hub.jsx */}
    </ErrorBoundary>
  );
}
```

- [ ] **Step 6: Create SettingsTab.jsx**

Create `src/pages/tabs/SettingsTab.jsx`. This component is rendered as a dropdown/overlay from the header, not as a true tab. It owns:
- Dark mode toggle
- Profile editing
- Family management (InviteAdultModal)
- Change password, Delete account, Support modals
- Notifications panel
- Logout action

```jsx
import React, { useState } from 'react';
import { db, SB, hd } from '../../lib/supabase';
import { showToast } from '../../lib/utils';
import { useHubData } from '../../hooks/useHubData';
import { OcvConfirm, OcvInput } from '../../components/modals';
import SupportModal from '../../components/modals/SupportModal';
import AddKidModal from '../../components/modals/AddKidModal';
import CancelFeedback from '../../components/CancelFeedback';

export default function SettingsTab({ onLogout, darkMode, setDarkMode }) {
  const { user, profile, kids, familyMembers, notifications, load, isAdmin } = useHubData();

  const [showSupport, setShowSupport] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [showDeleteAcct, setShowDeleteAcct] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  return (
    <ErrorBoundary label="Settings">
      {/* Settings/Profile dropdown JSX extracted from Hub.jsx */}
    </ErrorBoundary>
  );
}
```

- [ ] **Step 7: Rewrite Hub.jsx as thin shell**

Rewrite `src/pages/Hub.jsx` to be the thin shell. It should:
- Import HubDataProvider and wrap everything in it
- Own only: `tab`, `filter`, `darkMode`, `showFab`, `showProfile` state
- Render: header with tab pills + profile button, active tab component, FAB button
- Pass `filter` down to tabs and `onChangeTab` callback
- Pull-to-refresh logic stays in Hub (it calls `load()` from context)

The new Hub.jsx should be approximately 150-250 lines:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { clearTokens } from '../lib/supabase';
import { track, showToast } from '../lib/utils';
import { Capacitor } from '@capacitor/core';
import ICN from '../lib/icons';
import Logo from '../components/Logo';
import ErrorBoundary from '../components/ErrorBoundary';
import { HubDataProvider } from '../contexts/HubDataContext';
import { useHubData } from '../hooks/useHubData';
import OverviewTab from './tabs/OverviewTab';
import ScheduleTab from './tabs/ScheduleTab';
import MoneyTab from './tabs/MoneyTab';
import ExploreTab from './tabs/ExploreTab';
import SettingsTab from './tabs/SettingsTab';

function HubInner({ onLogout }) {
  const { members, loading, load, user, profile } = useHubData();
  const [tab, setTab] = useState('overview');
  const [filter, setFilter] = useState('all');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ocv-dark') === '1');
  const [showFab, setShowFab] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Pull-to-refresh refs
  const [ptrState, setPtrState] = useState('');
  const ptrStart = useRef(0);
  const ptrDist = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('ocv-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  // Pull-to-refresh handlers (keep in Hub shell)
  // ... ptrTouchStart, ptrTouchMove, ptrTouchEnd

  const renderTab = () => {
    switch (tab) {
      case 'overview': return <OverviewTab onChangeTab={setTab} />;
      case 'week': return <ScheduleTab filter={filter} />;
      case 'money': return <MoneyTab filter={filter} />;
      case 'explore': return <ExploreTab filter={filter} />;
      default: return <OverviewTab onChangeTab={setTab} />;
    }
  };

  return (
    <div /* root container with pull-to-refresh touch handlers */>
      {/* Header: Logo + member filter pills + profile button */}
      {/* Member filter pills */}
      {/* Active tab content */}
      {renderTab()}
      {/* Bottom tab bar */}
      {/* FAB button + bottom sheet */}
      {/* Settings overlay (when showProfile is true) */}
      {showProfile && <SettingsTab onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} />}
    </div>
  );
}

export default function Hub({ user, profile, onRefresh, onLogout }) {
  return (
    <HubDataProvider user={user} profile={profile}>
      <HubInner onLogout={onLogout} />
    </HubDataProvider>
  );
}
```

- [ ] **Step 8: Verify the app builds and runs**

```bash
npm run build
```

Expected: Build succeeds.

Then manually test:
1. `npm run dev` — open http://localhost:3000
2. Log in with a test account
3. Verify all 5 tabs render correctly
4. Verify modals open and save correctly
5. Verify pull-to-refresh works
6. Verify dark mode toggle works

- [ ] **Step 9: Commit**

```bash
git add src/pages/tabs/ src/pages/Hub.jsx
git commit -m "refactor: decompose Hub.jsx into tab components with shared HubDataContext"
```

---

## Task 6: Rename CSS Variables and Class Names

**Files:**
- Modify: `src/lib/global.css`
- Modify: All component files that reference old variable/class names

- [ ] **Step 1: Rename CSS variables in global.css**

In `src/lib/global.css`, apply these renames in `:root`:

| Old | New |
|-----|-----|
| `--g` | `--color-primary` |
| `--gl` | `--color-primary-light` |
| `--gxl` | `--color-primary-bg` |
| `--acc` | `--color-accent` |
| `--accl` | `--color-accent-bg` |
| `--sage` | `--color-sage` |
| `--warm` | `--color-warm` |
| `--card` | `--color-card` |
| `--tx` | `--color-text` |
| `--mt` | `--color-muted` |
| `--bd` | `--color-border` |
| `--sr` | `--font-serif` |
| `--sn` | `--font-sans` |

Apply the same renames in the `[data-theme="dark"]` block.

- [ ] **Step 2: Rename CSS class names in global.css**

| Old | New |
|-----|-----|
| `.bp` | `.btn-primary` |
| `.bs` | `.btn-secondary` |
| `.pon` | `.pill-active` |
| `.poff` | `.pill-inactive` |
| `.lbl` | `.label` |
| `.mbg` | `.modal-backdrop` |
| `.mbox` | `.modal-box` |
| `.hsb` | `.hide-scrollbar` |
| `.r` | `.anim-rise` |
| `.r2` | `.anim-rise-2` |
| `.r3` | `.anim-rise-3` |
| `.r4` | `.anim-rise-4` |
| `.fi` | `.anim-fade` |

- [ ] **Step 3: Find and replace old references in all component files**

Search the entire `src/` directory for each old variable and class name. Replace every occurrence.

Key files to update:
- `src/pages/Hub.jsx` (the new thin shell)
- `src/pages/tabs/OverviewTab.jsx`
- `src/pages/tabs/ScheduleTab.jsx`
- `src/pages/tabs/MoneyTab.jsx`
- `src/pages/tabs/ExploreTab.jsx`
- `src/pages/tabs/SettingsTab.jsx`
- `src/pages/Landing.jsx`
- `src/pages/Auth.jsx`
- `src/pages/OnboardKids.jsx`
- `src/pages/OnboardClubs.jsx`
- `src/pages/AdminDashboard.jsx`
- `src/components/ErrorBoundary.jsx`
- All files in `src/components/modals/`
- All files in `src/components/hub/`
- `src/lib/icons.jsx`
- `src/lib/utils.js` (if any CSS refs)
- `src/lib/constants.js` (if any CSS refs)

**Important:** Also update inline style references. Many components use `var(--g)` or `var(--mt)` in inline styles. These must become `var(--color-primary)` and `var(--color-muted)` etc.

Use project-wide find-and-replace. Process one variable at a time to avoid mistakes.

- [ ] **Step 4: Verify build and visual check**

```bash
npm run build && npm run dev
```

Open the app and verify:
1. Colors look identical to before
2. Dark mode still works
3. No missing styles or broken layouts
4. Check Landing page, Auth page, Hub (all tabs)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rename CSS variables and classes to semantic names"
```

---

## Task 7: Write Tests for HubDataContext

**Files:**
- Create: `src/contexts/__tests__/HubDataContext.test.jsx`

- [ ] **Step 1: Create context tests**

Create `src/contexts/__tests__/HubDataContext.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HubDataProvider } from '../HubDataContext';
import { useHubData } from '../../hooks/useHubData';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  db: vi.fn(),
  rpc: vi.fn(),
  SB: 'https://test.supabase.co',
  hd: () => ({ apikey: 'test', 'Content-Type': 'application/json', Authorization: 'Bearer test' }),
}));

vi.mock('../../lib/utils', () => ({
  getAge: vi.fn(() => 8),
  weekDates: vi.fn(() => {
    const d = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(d);
      day.setDate(d.getDate() - d.getDay() + 1 + i);
      return day;
    });
  }),
  calcKm: vi.fn(() => 5),
  fmtDist: vi.fn(() => '5km'),
  track: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../../lib/constants', () => ({
  COLS: ['#e85d4a', '#4a90d9', '#50c878', '#f5a623'],
}));

// Mock navigator.geolocation
Object.defineProperty(global.navigator, 'geolocation', {
  value: { getCurrentPosition: vi.fn((success) => success({ coords: { latitude: 53.3, longitude: -6.26 } })) },
  writable: true,
});

global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ status: 'success' }) }));

function TestConsumer() {
  const data = useHubData();
  return (
    <div>
      <span data-testid="loading">{data.loading ? 'true' : 'false'}</span>
      <span data-testid="kids">{JSON.stringify(data.kids)}</span>
      <span data-testid="has-load">{typeof data.load === 'function' ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('HubDataContext', () => {
  const mockUser = { id: 'user-123', email: 'test@test.com' };
  const mockProfile = { family_id: 'fam-1', family_role: 'admin', first_name: 'Dave' };

  beforeEach(() => {
    vi.resetAllMocks();
    const { db, rpc } = require('../../lib/supabase');
    // Default: all queries return empty arrays
    db.mockResolvedValue([]);
    rpc.mockResolvedValue(false);
  });

  it('provides data to child components', async () => {
    render(
      <HubDataProvider user={mockUser} profile={mockProfile}>
        <TestConsumer />
      </HubDataProvider>
    );
    expect(screen.getByTestId('has-load').textContent).toBe('yes');
  });

  it('throws when useHubData is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useHubData must be used within HubDataProvider');
    consoleSpy.mockRestore();
  });

  it('calls load on mount and sets loading to false after', async () => {
    const { db } = require('../../lib/supabase');
    db.mockImplementation((table) => {
      if (table === 'profiles') return Promise.resolve([{ family_id: 'fam-1' }]);
      if (table === 'dependants') return Promise.resolve([{ id: 'kid-1', first_name: 'Mia', date_of_birth: '2018-01-01' }]);
      return Promise.resolve([]);
    });

    render(
      <HubDataProvider user={mockUser} profile={mockProfile}>
        <TestConsumer />
      </HubDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/__tests__/HubDataContext.test.jsx
git commit -m "test: add HubDataContext tests"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Build for production**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Manual smoke test**

Run `npm run dev` and verify:
1. Landing page loads correctly
2. Login works
3. Hub loads — all 5 tabs render
4. Overview tab shows stats
5. Schedule tab shows week grid and calendar
6. Money tab shows payments
7. Explore tab shows clubs, camps, discover
8. Settings/Profile opens and dark mode toggles
9. FAB button opens action sheet
10. At least one modal (Add Event) opens and saves
11. Pull-to-refresh reloads data

- [ ] **Step 4: Check Hub.jsx line count**

```bash
wc -l src/pages/Hub.jsx
```

Expected: Under 250 lines.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: Phase 1 Foundation complete — Hub decomposed, tests added, CSS semantic"
```
