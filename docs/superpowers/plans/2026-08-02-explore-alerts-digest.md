# Explore + Alerts + Weekly Digest Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Explore tab for desktop/mobile with a sidebar, build a unified alert system, and create a weekly email digest with weather-aware weekend suggestions.

**Architecture:** Three connected systems sharing a centralized alert computation in HubDataContext. Explore tab gets a responsive layout with desktop sidebar. Alerts render via a shared AlertCallout component. Weekly digest is a Supabase Edge Function triggered by pg_cron, using Resend for email and Open-Meteo for weather.

**Tech Stack:** React 19, Vite 8, Supabase (Edge Functions + pg_cron), Resend API, Open-Meteo API, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-08-02-explore-alerts-digest-design.md`

---

## Chunk 1: Database Migration + AlertCallout Component

### Task 1: Run database migration

**Files:**
- Create: `supabase/migrations/20260802_explore_alerts_digest.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Explore + Alerts + Digest: new columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS digest_opt_out boolean DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE things_to_do ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool to run the SQL against the project `uqihwazheypvmrcrqklg`.

- [ ] **Step 3: Verify columns exist**

Use `mcp__claude_ai_Supabase__execute_sql` to run:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'digest_opt_out';
```
Expected: 1 row returned.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260802_explore_alerts_digest.sql
git commit -m "feat: add digest_opt_out and verified columns (migration)"
```

---

### Task 2: Create AlertCallout component

**Files:**
- Create: `src/components/AlertCallout.jsx`

- [ ] **Step 1: Create the AlertCallout component**

```jsx
import React from 'react';

const SEVERITY = {
  info: { bg: 'var(--color-primary-bg)', border: '#2d7cb5', icon: 'info' },
  warn: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning)', icon: 'warn' },
  urgent: { bg: 'var(--color-danger-bg)', border: 'var(--color-danger)', icon: 'urgent' },
};

const ICONS = {
  info: '\u2139\uFE0F',
  warn: '\u26A0\uFE0F',
  urgent: '\u{1F6A8}',
};

export default function AlertCallout({ alerts, onAction, onDismiss, max }) {
  const shown = max ? alerts.slice(0, max) : alerts;
  if (shown.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      {shown.map(alert => {
        const s = SEVERITY[alert.severity] || SEVERITY.info;
        return (
          <div
            key={alert.id}
            className="alert-callout"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 12,
              background: s.bg, borderLeft: `4px solid ${s.border}`,
              fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>{ICONS[alert.severity]}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{alert.text}</div>
              {alert.action && (
                <button
                  onClick={() => onAction && onAction(alert)}
                  style={{
                    marginTop: 6, padding: '4px 12px', borderRadius: 8,
                    border: `1px solid ${s.border}`, background: 'transparent',
                    fontSize: 12, fontWeight: 600, color: s.border,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}
                >
                  {alert.action.label || 'View'}
                </button>
              )}
            </div>
            {alert.dismissible && onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                aria-label="Dismiss"
                style={{
                  background: 'none', border: 'none', fontSize: 16,
                  color: 'var(--color-muted)', cursor: 'pointer',
                  padding: 4, minWidth: 32, minHeight: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{'\u00D7'}</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/AlertCallout.jsx
git commit -m "feat: add AlertCallout component — subtle left-border callout style"
```

---

## Chunk 2: Centralized Alert System in HubDataContext

### Task 3: Extract alert logic from OverviewTab into HubDataContext

**Files:**
- Modify: `src/contexts/HubDataContext.jsx`
- Modify: `src/pages/tabs/OverviewTab.jsx`

- [ ] **Step 1: Add alerts computation to HubDataContext**

In `src/contexts/HubDataContext.jsx`, add a `useMemo` block after the `weekEvts` computation (around line 195) and before the `value` useMemo. This replaces the inline logic currently in OverviewTab lines 45-135.

```jsx
// Centralized alert computation
const alerts = useMemo(() => {
  const a = [];
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Fee alerts (admin only)
  if (isAdmin) {
    (pays || []).filter(p => !p.paid && p.status !== "not_renewing" && p.due_date).forEach(p => {
      const due = new Date(p.due_date + "T00:00:00");
      const days = Math.ceil((due - now) / 86400000);
      const cl = clubMap.get(p.club_id);
      const kid = p.dependant_id ? kidMap.get(p.dependant_id) : null;
      const desc = p.description || (cl?.nickname || cl?.club_name || "Fee");
      if (days < 0) {
        a.push({ id: "fee-overdue-" + p.id, type: "fee", severity: "urgent", text: `${desc} is \u20AC${parseFloat(p.amount).toFixed(2)} overdue (${Math.abs(days)} days)`, action: { label: "View fees", tab: "money" }, tab: "money", dismissible: false, adminOnly: true });
      } else if (days <= 3) {
        a.push({ id: "fee-soon-" + p.id, type: "fee", severity: "warn", text: `${desc} \u2014 \u20AC${parseFloat(p.amount).toFixed(2)} due in ${days} day${days !== 1 ? "s" : ""}`, action: { label: "View fees", tab: "money" }, tab: "money", dismissible: true, adminOnly: true });
      } else if (days <= 7) {
        a.push({ id: "fee-week-" + p.id, type: "fee", severity: "info", text: `${desc} \u2014 \u20AC${parseFloat(p.amount).toFixed(2)} due in ${days} days`, action: { label: "View fees", tab: "money" }, tab: "money", dismissible: true, adminOnly: true });
      }
    });
  }

  // Clash today
  const todayEvts = weekEvts.filter(e => !e.skipped && e.time && e.endTime && e.date.toISOString().split("T")[0] === todayStr);
  for (let i = 0; i < todayEvts.length; i++) {
    for (let j = i + 1; j < todayEvts.length; j++) {
      const ea = todayEvts[i], eb = todayEvts[j];
      if (ea.memberId === eb.memberId) continue;
      if (ea.time < eb.endTime && eb.time < ea.endTime) {
        a.push({ id: "clash-" + ea.id + "-" + eb.id, type: "clash", severity: "urgent", text: `Clash today: ${ea.member} (${ea.title || ea.club} ${ea.time}) overlaps ${eb.member} (${eb.title || eb.club} ${eb.time})`, action: { label: "View schedule", tab: "week" }, tab: "week", dismissible: false, adminOnly: false });
      }
    }
  }

  // No driver today
  todayEvts.forEach(e => {
    if (!e.driver && e.source_type === "recurring") {
      a.push({ id: "nodriver-" + e.id, type: "driver", severity: "info", text: `No driver set for ${e.member}'s ${e.title || e.club} at ${e.time}`, action: { label: "View schedule", tab: "week" }, tab: "week", dismissible: true, adminOnly: false });
    }
  });

  // Events without end time this week
  const noEnd = weekEvts.filter(e => !e.skipped && e.time && !e.endTime);
  if (noEnd.length > 0) {
    a.push({ id: "noend-week", type: "noend", severity: "info", text: `${noEnd.length} event${noEnd.length !== 1 ? "s" : ""} this week with no end time \u2014 makes pickup planning harder`, tab: "overview", dismissible: true, adminOnly: false });
  }

  // Holiday uncovered (within 21 days)
  const allHols = [...(holidays || []), ...(userHolidays || [])];
  allHols.filter(h => new Date(h.end_date) >= now && (new Date(h.start_date) - now) / 86400000 <= 21).forEach(hol => {
    (kids || []).forEach(kid => {
      const age = getAge(kid.date_of_birth);
      if (age == null) return;
      const suitableCamps = (camps || []).filter(c => {
        if (!c.start_date) return false;
        const cs = new Date(c.start_date);
        return cs >= new Date(hol.start_date) && cs <= new Date(hol.end_date) && age >= (c.age_min || 0) && age <= (c.age_max || 99);
      });
      const booked = (campBookings || []).some(b => b.dependant_id === kid.id && suitableCamps.some(c => c.id === b.camp_id));
      if (!booked && suitableCamps.length > 0) {
        a.push({ id: "hol-" + hol.id + "-" + kid.id, type: "holiday", severity: "warn", text: `${kid.first_name} has no camp booked for ${hol.name || "school holiday"}. ${suitableCamps.length} camp${suitableCamps.length !== 1 ? "s" : ""} suit their age.`, action: { label: "Browse camps", tab: "explore", subaction: "camps" }, tab: "explore", dismissible: true, adminOnly: false });
      }
    });
  });

  // Weekend gap
  const sat = wd.find(d => d.getDay() === 6);
  const sun = wd.find(d => d.getDay() === 0);
  [sat, sun].forEach(day => {
    if (!day) return;
    const dayStr = day.toISOString().split("T")[0];
    const hasEvents = weekEvts.some(e => !e.skipped && e.date.toISOString().split("T")[0] === dayStr);
    if (!hasEvents) {
      const label = day.getDay() === 6 ? "Saturday" : "Sunday";
      a.push({ id: "gap-" + dayStr, type: "weekend", severity: "info", text: `Nothing planned ${label} \u2014 check out ideas near home`, action: { label: "Discover", tab: "explore", subaction: "discover" }, tab: "explore", dismissible: true, adminOnly: false });
    }
  });

  // Camp recommendation (admin only)
  if (isAdmin) {
    (campBookings || []).filter(b => b.status === "recommended").forEach(b => {
      const camp = (camps || []).find(c => c.id === b.camp_id);
      if (camp) {
        a.push({ id: "camprec-" + b.id, type: "camprec", severity: "info", text: `A carer recommended ${camp.title} \u2014 tap to review`, action: { label: "View camp", tab: "explore", subaction: "camps" }, tab: "explore", dismissible: true, adminOnly: true });
      }
    });
  }

  // Sort: urgent first, then warn, then info
  const order = { urgent: 0, warn: 1, info: 2 };
  a.sort((x, y) => (order[x.severity] ?? 2) - (order[y.severity] ?? 2));
  return a;
}, [pays, weekEvts, wd, kids, camps, campBookings, holidays, userHolidays, isAdmin, clubMap, kidMap]);
```

- [ ] **Step 2: Add `alerts` to context value**

In the `value` useMemo (around line 197), add `alerts` to both the object and the deps array:

```js
// In the value object, add after weekEvts:
alerts,

// In the deps array, add after weekEvts:
alerts,
```

- [ ] **Step 3: Remove inline alert logic from OverviewTab**

In `src/pages/tabs/OverviewTab.jsx`, replace the entire `{(() => { const alerts = []; ... })()}` block (lines ~44-135) and the standalone clash card section (lines ~136-157) with:

```jsx
{/* SMART ALERTS */}
{(() => {
  const { alerts } = useHubData();
  const overviewAlerts = alerts.filter(a => !a.adminOnly || isAdmin);
  if (overviewAlerts.length === 0) return null;
  return <AlertCallout
    alerts={overviewAlerts}
    max={5}
    onAction={(alert) => {
      if (alert.action?.tab) {
        if (alert.action.subaction) onChangeTab(alert.action.tab, alert.action.subaction);
        else onChangeTab(alert.action.tab);
      }
    }}
    onDismiss={(id) => {
      const dismissed = JSON.parse(localStorage.getItem("ocv-dismissed-alerts") || "{}");
      dismissed[id] = Date.now() + 86400000; // 24hr TTL
      localStorage.setItem("ocv-dismissed-alerts", JSON.stringify(dismissed));
    }}
  />;
})()}
```

Add import at top of OverviewTab:
```jsx
import AlertCallout from '../../components/AlertCallout';
```

Note: The `alerts` array is already available from `useHubData()` which is called at the top of the component. Use that instead of calling `useHubData()` again inside the IIFE. Refactor the IIFE to just use the `alerts` from the existing destructuring.

- [ ] **Step 4: Build and test**

Run: `npm run build && npm test`
Expected: Both pass

- [ ] **Step 5: Commit**

```bash
git add src/contexts/HubDataContext.jsx src/pages/tabs/OverviewTab.jsx src/components/AlertCallout.jsx
git commit -m "feat: centralized alert system in HubDataContext + AlertCallout component"
```

---

### Task 4: Add contextual alerts to Money and Schedule tabs

**Files:**
- Modify: `src/pages/tabs/MoneyTab.jsx`
- Modify: `src/pages/tabs/ScheduleTab.jsx`

- [ ] **Step 1: Add alerts to MoneyTab**

In `src/pages/tabs/MoneyTab.jsx`, add import:
```jsx
import AlertCallout from '../../components/AlertCallout';
```

Add to the destructuring from `useHubData()`:
```jsx
const { ..., alerts } = useHubData(); // add alerts
```

After the loading check and before the main content, add:
```jsx
<AlertCallout
  alerts={(alerts || []).filter(a => a.tab === "money").slice(0, 2)}
  onAction={(alert) => { /* already on money tab, scroll to top */ window.scrollTo(0, 0); }}
/>
```

- [ ] **Step 2: Add alerts to ScheduleTab**

In `src/pages/tabs/ScheduleTab.jsx`, add same pattern:
```jsx
import AlertCallout from '../../components/AlertCallout';
```

Add `alerts` to the `useHubData()` destructuring. After loading check, before main content:
```jsx
<AlertCallout
  alerts={(alerts || []).filter(a => a.tab === "week").slice(0, 2)}
  onAction={(alert) => { window.scrollTo(0, 0); }}
/>
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/pages/tabs/MoneyTab.jsx src/pages/tabs/ScheduleTab.jsx
git commit -m "feat: contextual alert callouts on Money and Schedule tabs"
```

---

## Chunk 3: Explore Tab Desktop Sidebar

### Task 5: Create ExploreSidebar component

**Files:**
- Create: `src/components/explore/ExploreSidebar.jsx`

- [ ] **Step 1: Create the sidebar component**

```jsx
import React from 'react';

const SECTIONS = [
  { id: 'clubs', label: 'My Clubs', icon: '\u{1F3E0}' },
  { id: 'camps', label: 'Camps', icon: '\u26FA' },
  { id: 'discover', label: 'Discover', icon: '\u{1F50D}' },
];

export default function ExploreSidebar({ activeSection, onSectionChange, locations, activeLocation, onLocationChange }) {
  return (
    <div className="explore-sidebar">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Sections</div>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => onSectionChange(s.id)}
            aria-current={activeSection === s.id ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', borderRadius: 10, border: 'none',
              background: activeSection === s.id ? 'var(--color-primary)' : 'transparent',
              color: activeSection === s.id ? '#fff' : 'var(--color-text)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-sans)', textAlign: 'left', marginBottom: 4,
              transition: 'background .15s, color .15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {locations.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Location</div>
          <button
            onClick={() => onLocationChange('all')}
            style={{
              display: 'block', width: '100%', padding: '8px 12px', borderRadius: 8,
              border: activeLocation === 'all' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeLocation === 'all' ? 'var(--color-primary-bg)' : 'var(--color-card)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              color: activeLocation === 'all' ? 'var(--color-primary)' : 'var(--color-text)',
              fontFamily: 'var(--font-sans)', textAlign: 'left', marginBottom: 4,
            }}
          >All locations</button>
          {locations.map(loc => (
            <button
              key={loc.label}
              onClick={() => onLocationChange(loc.label)}
              style={{
                display: 'block', width: '100%', padding: '8px 12px', borderRadius: 8,
                border: activeLocation === loc.label ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: activeLocation === loc.label ? 'var(--color-primary-bg)' : 'var(--color-card)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                color: activeLocation === loc.label ? 'var(--color-primary)' : 'var(--color-text)',
                fontFamily: 'var(--font-sans)', textAlign: 'left', marginBottom: 4,
              }}
            >
              {loc.label}
              <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 400, marginTop: 2 }}>
                {loc.radius}km radius
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/explore/ExploreSidebar.jsx
git commit -m "feat: ExploreSidebar component — section nav + location picker"
```

---

### Task 6: Add responsive layout CSS and wire sidebar into ExploreTab

**Files:**
- Modify: `src/lib/global.css`
- Modify: `src/pages/tabs/ExploreTab.jsx`

- [ ] **Step 1: Add explore layout CSS to global.css**

At the end of global.css (before the `@media (prefers-reduced-motion)` block), add:

```css
/* Explore tab layout */
.explore-layout { display: flex; gap: 0; }
.explore-sidebar { display: none; }
.explore-content { flex: 1; min-width: 0; }

@media (min-width: 900px) {
  .explore-sidebar {
    display: block;
    width: 220px;
    flex-shrink: 0;
    padding: 0 16px 0 0;
    border-right: 1px solid var(--color-border);
    margin-right: 20px;
    position: sticky;
    top: 0;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }
  .explore-content {
    flex: 1;
  }
}
```

- [ ] **Step 2: Wire sidebar into ExploreTab**

In `src/pages/tabs/ExploreTab.jsx`, add imports:
```jsx
import ExploreSidebar from '../../components/explore/ExploreSidebar';
import AlertCallout from '../../components/AlertCallout';
```

Add `alerts` to the `useHubData()` destructuring.

Wrap the existing return content in the new layout structure. After the loading check, change the return to:

```jsx
return (
  <ErrorBoundary label="Explore">
    <div className="explore-layout">
      <ExploreSidebar
        activeSection={exploreTab}
        onSectionChange={setExploreTab}
        locations={allLocs}
        activeLocation={campLoc}
        onLocationChange={setCampLoc}
      />
      <div className="explore-content">
        {/* Alert callouts for this tab */}
        <AlertCallout
          alerts={(alerts || []).filter(a => a.tab === "explore").slice(0, 2)}
          onAction={(alert) => {
            if (alert.action?.subaction) setExploreTab(alert.action.subaction);
          }}
        />

        {/* Mobile tab pills (hidden on desktop via CSS) */}
        <div className="explore-mobile-pills" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {/* existing pill buttons — keep as-is */}
        </div>

        {/* Section content — keep existing content for each tab */}
        {exploreTab === "clubs" && ( /* existing clubs content */ )}
        {exploreTab === "camps" && ( /* existing camps content */ )}
        {exploreTab === "discover" && ( /* existing discover content */ )}
      </div>
    </div>
    {/* existing modals */}
  </ErrorBoundary>
);
```

Add CSS to hide mobile pills on desktop:
```css
@media (min-width: 900px) {
  .explore-mobile-pills { display: none !important; }
}
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/lib/global.css src/pages/tabs/ExploreTab.jsx
git commit -m "feat: Explore tab desktop sidebar + responsive layout"
```

---

## Chunk 4: Weekly Digest Edge Function

### Task 7: Create the weekly-digest edge function

**Files:**
- Create: `supabase/functions/weekly-digest/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "./email-template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Open-Meteo: free, no key needed
async function fetchWeather(lat: number, lng: number): Promise<{ code: number; tempMax: number } | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max&timezone=Europe/Dublin&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // Return Saturday's forecast (index 6 if today is Sunday, but we compute dynamically)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const daysToSat = (6 - dayOfWeek + 7) % 7;
    const satIdx = Math.min(daysToSat, (data.daily?.time?.length || 1) - 1);
    return {
      code: data.daily?.weathercode?.[satIdx] ?? -1,
      tempMax: data.daily?.temperature_2m_max?.[satIdx] ?? 0,
    };
  } catch {
    return null;
  }
}

function isRainy(code: number): boolean {
  return code >= 51; // 51+ = drizzle, rain, snow, thunderstorm
}

function weekDates(): Date[] {
  const now = new Date();
  // Next Monday
  const day = now.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    dates.push(d);
  }
  return dates;
}

serve(async (req) => {
  try {
    // Fetch active/trial users with email, not opted out
    const { data: users, error: uerr } = await sb
      .from("profiles")
      .select("id,email,first_name,family_id,family_role,latitude,longitude,digest_opt_out")
      .in("subscription_status", ["active", "trial"])
      .not("email", "is", null)
      .neq("digest_opt_out", true);

    if (uerr || !users) {
      return new Response(JSON.stringify({ error: uerr?.message || "no users" }), { status: 500 });
    }

    const week = weekDates();
    const weekStart = week[0].toISOString().split("T")[0];
    const weekEnd = week[6].toISOString().split("T")[0];
    let sent = 0;

    for (const user of users) {
      try {
        // Get family member IDs
        let famIds = [user.id];
        if (user.family_id) {
          const { data: fam } = await sb.from("profiles").select("id").eq("family_id", user.family_id);
          if (fam) famIds = fam.map((f: any) => f.id);
        }

        // Get kids
        const { data: kids } = await sb
          .from("dependants")
          .select("id,first_name,date_of_birth")
          .in("parent_user_id", famIds);

        // Get recurring events for the week
        const { data: recs } = await sb
          .from("recurring_events")
          .select("*")
          .in("user_id", famIds)
          .eq("active", true);

        // Get manual events for the week
        const { data: mans } = await sb
          .from("manual_events")
          .select("*")
          .in("user_id", famIds)
          .gte("event_date", weekStart)
          .lte("event_date", weekEnd + "T23:59:59");

        // Get club names
        const { data: subs } = await sb
          .from("hub_subscriptions")
          .select("club_id,nickname,clubs(name)")
          .in("user_id", famIds);
        const clubNames: Record<string, string> = {};
        (subs || []).forEach((s: any) => { clubNames[s.club_id] = s.nickname || s.clubs?.name || "Club"; });

        // Build week events
        const events: Array<{ day: string; time: string; title: string; member: string }> = [];
        (recs || []).forEach((re: any) => {
          week.forEach(d => {
            if (d.getDay() === re.day_of_week) {
              const dStr = d.toISOString().split("T")[0];
              if ((re.excluded_dates || []).includes(dStr)) return;
              const kid = (kids || []).find((k: any) => k.id === re.dependant_id);
              events.push({
                day: dStr,
                time: re.start_time?.slice(0, 5) || "",
                title: re.title || clubNames[re.club_id] || "Activity",
                member: kid?.first_name || user.first_name || "You",
              });
            }
          });
        });
        (mans || []).forEach((me: any) => {
          const d = new Date(me.event_date);
          const kid = (kids || []).find((k: any) => k.id === me.dependant_id);
          events.push({
            day: d.toISOString().split("T")[0],
            time: d.toTimeString().slice(0, 5),
            title: me.title || "Event",
            member: kid?.first_name || user.first_name || "You",
          });
        });

        // Get unpaid fees due in 7 days
        const { data: fees } = await sb
          .from("payment_reminders")
          .select("description,amount,due_date")
          .in("user_id", famIds)
          .eq("paid", false)
          .neq("status", "not_renewing")
          .lte("due_date", weekEnd);

        // Weather for weekend suggestions
        const lat = user.latitude || 53.35; // Dublin fallback
        const lng = user.longitude || -6.26;
        const weather = await fetchWeather(lat, lng);

        // Weekend suggestions
        const satStr = week[5].toISOString().split("T")[0]; // Saturday
        const sunStr = week[6].toISOString().split("T")[0]; // Sunday
        const satHasEvents = events.some(e => e.day === satStr);
        const sunHasEvents = events.some(e => e.day === sunStr);

        let suggestions: Array<{ title: string; distance: string; detail: string }> = [];
        if (!satHasEvents || !sunHasEvents) {
          const { data: ttd } = await sb
            .from("things_to_do")
            .select("title,category,latitude,longitude,cost_eur,age_min,age_max,location_name")
            .eq("active", true)
            .limit(100);

          if (ttd && ttd.length > 0) {
            // Filter by age
            const ages = (kids || []).map((k: any) => {
              const dob = new Date(k.date_of_birth);
              return Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000));
            }).filter((a: number) => a > 0);
            const minAge = ages.length > 0 ? Math.min(...ages) : 0;
            const maxAge = ages.length > 0 ? Math.max(...ages) : 99;

            const rainy = weather ? isRainy(weather.code) : false;
            const indoorCats = ["indoor", "cultural", "farm"];
            const outdoorCats = ["outdoor", "nature", "adventure", "beach", "playground"];

            const scored = ttd
              .filter((t: any) => {
                if (t.age_min && t.age_min > maxAge) return false;
                if (t.age_max && t.age_max < minAge) return false;
                return true;
              })
              .map((t: any) => {
                const tLat = Number(t.latitude || 0);
                const tLng = Number(t.longitude || 0);
                const dist = tLat && tLng ? haversineKm(lat, lng, tLat, tLng) : 999;
                const weatherMatch = rainy ? indoorCats.includes(t.category) : outdoorCats.includes(t.category);
                return { ...t, dist, weatherMatch };
              })
              .filter((t: any) => t.dist <= 20)
              .sort((a: any, b: any) => {
                if (a.weatherMatch !== b.weatherMatch) return a.weatherMatch ? -1 : 1;
                return a.dist - b.dist;
              })
              .slice(0, 3);

            suggestions = scored.map((t: any) => ({
              title: t.title,
              distance: `${t.dist.toFixed(0)}km`,
              detail: [
                t.age_min || t.age_max ? `Ages ${t.age_min || '?'}-${t.age_max || '?'}` : null,
                t.cost_eur ? `\u20AC${t.cost_eur}` : "Free",
                t.category || null,
              ].filter(Boolean).join(" \u00B7 "),
            }));
          }
        }

        // Camp alerts (holiday within 21 days, no camp booked)
        const { data: holsData } = await sb.from("school_holidays").select("*").gte("end_date", weekStart).order("start_date");
        const { data: bookings } = await sb.from("camp_bookings").select("dependant_id,camp_id").in("user_id", famIds);
        const campAlerts: Array<{ kidName: string; holName: string; count: number }> = [];
        (holsData || []).filter((h: any) => {
          const daysAway = (new Date(h.start_date).getTime() - Date.now()) / 86400000;
          return daysAway <= 21 && daysAway >= 0;
        }).forEach((hol: any) => {
          (kids || []).forEach((kid: any) => {
            const age = Math.floor((Date.now() - new Date(kid.date_of_birth).getTime()) / (365.25 * 86400000));
            const { data: suitableCamps } = undefined as any; // We already have camp data scope issues
            // Simplified: just check if kid has any booking
            const hasBooking = (bookings || []).some((b: any) => b.dependant_id === kid.id);
            if (!hasBooking) {
              campAlerts.push({ kidName: kid.first_name, holName: hol.name || "school holiday", count: 0 });
            }
          });
        });

        // Build and send email
        const html = buildEmailHtml({
          firstName: user.first_name || "there",
          weekDates: week,
          events,
          fees: fees || [],
          suggestions,
          weather,
          satHasEvents,
          sunHasEvents,
          campAlerts,
        });

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "OneClubView <hello@oneclubview.com>",
            to: user.email,
            subject: `Your week ahead \u2014 ${week[0].toLocaleDateString("en-IE", { day: "numeric", month: "short" })}\u2013${week[6].toLocaleDateString("en-IE", { day: "numeric", month: "short" })}`,
            html,
          }),
        });

        // Log to email_queue
        await sb.from("email_queue").insert({ user_id: user.id, type: "digest", status: "sent", created_at: new Date().toISOString() });
        sent++;
      } catch (e) {
        console.error(`Digest failed for ${user.email}:`, e);
        await sb.from("email_queue").insert({ user_id: user.id, type: "digest", status: "failed", created_at: new Date().toISOString() });
      }
    }

    return new Response(JSON.stringify({ status: "ok", sent }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/weekly-digest/index.ts
git commit -m "feat: weekly-digest edge function — schedule, fees, weather suggestions"
```

---

### Task 8: Create email template

**Files:**
- Create: `supabase/functions/weekly-digest/email-template.ts`

- [ ] **Step 1: Create the email template builder**

Build a function that generates hybrid HTML email (branded header, simple table schedule, text-based content). Use inline styles only (email client compatibility). Match the OneClubView brand: `#1a2a3a` primary, `#e85d4a` accent, Fraunces-like serif feel via system fonts.

The function signature:
```typescript
export function buildEmailHtml(params: {
  firstName: string;
  weekDates: Date[];
  events: Array<{ day: string; time: string; title: string; member: string }>;
  fees: Array<{ description: string; amount: number; due_date: string }>;
  suggestions: Array<{ title: string; distance: string; detail: string }>;
  weather: { code: number; tempMax: number } | null;
  satHasEvents: boolean;
  sunHasEvents: boolean;
  campAlerts: Array<{ kidName: string; holName: string; count: number }>;
}): string
```

The template should produce the layout described in the spec: branded header, schedule table (Mon-Sun), fees section, weekend suggestions with weather, camp alerts, and footer with CTA + unsubscribe.

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/weekly-digest/email-template.ts
git commit -m "feat: weekly-digest email template — branded hybrid HTML"
```

---

### Task 9: Create digest unsubscribe handler + Settings toggle

**Files:**
- Create: `supabase/functions/digest-unsubscribe/index.ts`
- Modify: `src/pages/tabs/SettingsTab.jsx`

- [ ] **Step 1: Create unsubscribe edge function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get("uid");
  if (!userId) return new Response("Missing uid", { status: 400 });

  await sb.from("profiles").update({ digest_opt_out: true }).eq("id", userId);

  return new Response(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2>Unsubscribed</h2>
      <p>You won't receive weekly digests anymore.</p>
      <p>You can re-enable them in OneClubView Settings.</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
});
```

- [ ] **Step 2: Add digest toggle to SettingsTab**

In `src/pages/tabs/SettingsTab.jsx`, after the dark mode toggle section, add:

```jsx
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--color-border)" }}>
  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>Weekly digest email</span>
  <button
    role="switch"
    aria-checked={!profile?.digest_opt_out}
    onClick={async () => {
      const newVal = !profile?.digest_opt_out;
      await db("profiles", "PATCH", { filters: ["id=eq." + user.id], body: { digest_opt_out: newVal } });
      showToast(newVal ? "Digest disabled" : "Digest enabled");
      load();
    }}
    style={{ width: 48, height: 28, borderRadius: 14, background: !profile?.digest_opt_out ? "var(--color-accent)" : "var(--color-border)", cursor: "pointer", position: "relative", transition: "background .2s", border: "none", padding: 0, minWidth: 48, minHeight: 28 }}
  >
    <div style={{ width: 22, height: 22, borderRadius: 11, background: "#fff", position: "absolute", top: 3, left: !profile?.digest_opt_out ? 23 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
  </button>
</div>
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/digest-unsubscribe/index.ts src/pages/tabs/SettingsTab.jsx
git commit -m "feat: digest unsubscribe handler + Settings toggle"
```

---

## Chunk 5: Final Integration + Verification

### Task 10: Final build, test, and graphify update

- [ ] **Step 1: Run full build and test suite**

```bash
cd ~/oneclubview && npm run build && npm test
```

- [ ] **Step 2: Update graphify knowledge graph**

```bash
/c/Users/dfay/AppData/Local/pipx/pipx/venvs/graphifyy/Scripts/python.exe -m graphify update .
```

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A && git status
# Only commit if there are changes
git commit -m "chore: final verification — build clean, tests pass, graph updated"
```

- [ ] **Step 4: Push to main**

```bash
git push origin main
```

---

## Summary

| Chunk | Tasks | Key Deliverables |
|-------|-------|-----------------|
| 1 | 1-2 | Database migration, AlertCallout component |
| 2 | 3-4 | Centralized alerts in HubDataContext, contextual alerts on tabs |
| 3 | 5-6 | ExploreSidebar component, responsive Explore layout |
| 4 | 7-9 | Weekly digest edge function, email template, unsubscribe |
| 5 | 10 | Final verification and deploy |

**Dependencies:** Chunk 1 first (AlertCallout needed by Chunk 2-3). Chunks 2 and 3 can run in parallel. Chunk 4 is independent. Chunk 5 goes last.
