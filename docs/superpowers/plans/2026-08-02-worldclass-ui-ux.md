# OneClubView Worldclass UI/UX Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical security, accessibility, and UX issues identified in the 3-agent audit (60 findings), making OneClubView bulletproof and polished.

**Architecture:** Targeted fixes across the existing React 19 + Vite 8 SPA. No new libraries. Design system improvements in `global.css`. Security fixes in data layer. Accessibility via ARIA attributes and semantic HTML. UX improvements via new modals, routing, and interaction patterns.

**Tech Stack:** React 19, Vite 8, Supabase, CSS custom properties, Capacitor 8

---

## Chunk 1: Critical Security Fixes (30 min)

### Task 1: Fix isAdmin default to false

**Files:**
- Modify: `src/contexts/HubDataContext.jsx:144`
- Test: `src/contexts/__tests__/HubDataContext.test.jsx`

- [ ] **Step 1: Write failing test**

In `src/contexts/__tests__/HubDataContext.test.jsx`, add a test that verifies `isAdmin` is `false` when `family_role` is missing:

```jsx
it('defaults isAdmin to false when family_role is missing', async () => {
  // Override profile to have no family_role
  mockSupabase.db.mockImplementation((table, method) => {
    if (table === 'profiles') return [{ id: 'user-1', email: 'test@test.com' }]; // no family_role
    return [];
  });

  const { result } = renderHook(() => useHubData(), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.isAdmin).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --reporter=verbose`
Expected: FAIL — `isAdmin` is `true` when `family_role` is undefined

- [ ] **Step 3: Fix the default**

In `src/contexts/HubDataContext.jsx`, line 144, change:

```js
// OLD
const isAdmin=(profile?.family_role||"admin")==="admin";

// NEW
const isAdmin=profile?.family_role==="admin";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/contexts/HubDataContext.jsx src/contexts/__tests__/HubDataContext.test.jsx
git commit -m "security: fix isAdmin defaulting to true when family_role is missing"
```

---

### Task 2: Harden AdminDashboard gating

**Files:**
- Modify: `src/pages/AdminDashboard.jsx:5,13-14`
- Modify: `src/App.jsx:130`

- [ ] **Step 1: Add email check to AdminDashboard**

In `src/pages/AdminDashboard.jsx`, the component signature on line 5 needs `user` (already received). Add the email check at line 14:

```jsx
// OLD (line 13-15)
const profileCheck=await db("profiles","GET",{filters:["id=eq."+user.id],select:"family_role"});
if(!profileCheck?.[0]||profileCheck[0].family_role!=="admin"){

// NEW
const profileCheck=await db("profiles","GET",{filters:["id=eq."+user.id],select:"family_role,email"});
if(!profileCheck?.[0]||profileCheck[0].family_role!=="admin"||user?.email!=="hello@oneclubview.com"){
```

- [ ] **Step 2: Fix the Logout button calling onBack instead of onLogout**

In `src/pages/AdminDashboard.jsx`, line 5, destructure `onLogout`:

```jsx
// OLD
export default function AdminDashboard({user,onBack}){

// NEW
export default function AdminDashboard({user,onBack,onLogout}){
```

Line 213, change the button handler:

```jsx
// OLD
<button onClick={onBack} style={{...}}>Logout</button>

// NEW
<button onClick={onLogout||onBack} style={{...}}>Logout</button>
```

- [ ] **Step 3: Fix hardcoded MRR calculation**

In `src/pages/AdminDashboard.jsx`, line 158, replace hardcoded price:

```jsx
// OLD
<div ...>€{(active.length*4.99).toFixed(2)}</div>

// NEW
<div ...>€{stats?.mrr||"0.00"}</div>
```

And line 160:

```jsx
// OLD
<div ...>{active.length} active subscriber{active.length!==1?"s":""} × €4.99</div>

// NEW
<div ...>{active.length} active subscriber{active.length!==1?"s":""}</div>
```

And line 164:

```jsx
// OLD
<span ...>€4.99/mo</span>

// NEW
<span ...>Subscribed</span>
```

- [ ] **Step 4: Build to verify no errors**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminDashboard.jsx
git commit -m "security: harden admin dashboard — email check, fix logout, use server MRR"
```

---

### Task 3: Fix stale weekDates and getMemberCol

**Files:**
- Modify: `src/contexts/HubDataContext.jsx:139,147-152,217`

- [ ] **Step 1: Fix weekDates going stale overnight**

Line 139, add date dependency:

```js
// OLD
const wd=useMemo(()=>weekDates(),[]);

// NEW
const today=new Date().toISOString().split("T")[0];
const wd=useMemo(()=>weekDates(),[today]);
```

- [ ] **Step 2: Memoize getMemberCol so context value is stable**

Wrap `getMemberCol` in `useCallback`:

```js
// OLD (lines 147-152)
function getMemberCol(memberId,fallback){
  const kidIdx=kids.findIndex(k=>k.id===memberId);
  if(kidIdx>=0)return COLS[kidIdx%COLS.length];
  if(memberId==="self")return "var(--color-primary)";
  return fallback||"#999";
}

// NEW
const getMemberCol=useCallback((memberId,fallback)=>{
  const kidIdx=kids.findIndex(k=>k.id===memberId);
  if(kidIdx>=0)return COLS[kidIdx%COLS.length];
  if(memberId==="self")return "var(--color-primary)";
  return fallback||"#999";
},[kids]);
```

Add `getMemberCol` to the context value `useMemo` deps (line 217):

```js
// OLD
load, user, profile,

// NEW
load, getMemberCol, user, profile,
```

- [ ] **Step 3: Build and test**

Run: `npm run build && npm test`
Expected: Both pass

- [ ] **Step 4: Commit**

```bash
git add src/contexts/HubDataContext.jsx
git commit -m "fix: weekDates refreshes daily, memoize getMemberCol"
```

---

## Chunk 2: OcvModal Hardening (30 min)

### Task 4: Add scroll lock, Escape handler, ARIA, and touch targets to OcvModal

**Files:**
- Modify: `src/components/modals/OcvModal.jsx`

- [ ] **Step 1: Rewrite OcvModal with all fixes**

```jsx
import React, { useEffect } from 'react';

export default function OcvModal({ open, onClose, title, children, footer, width }) {
  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="modal-backdrop modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="modal-box modal-sheet"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: width || 480 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 800, color: 'var(--color-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--color-muted)', cursor: 'pointer', padding: '8px', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >{'\u00D7'}</button>
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 120px)' }}>
          {children}
        </div>
        {footer && <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>{footer}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/OcvModal.jsx
git commit -m "fix: OcvModal — scroll lock, Escape handler, ARIA dialog role, 44px close button"
```

---

## Chunk 3: Design System & Dark Mode Fixes (1 hr)

### Task 5: Add missing CSS variables and prefers-reduced-motion

**Files:**
- Modify: `src/lib/global.css`

- [ ] **Step 1: Add missing color vars and focus styles to :root block**

After line 25 (`--color-danger: #dc2626;`), add:

```css
  --color-danger-bg: #fef2f2;
  --color-danger-border: #fecaca;
  --color-success: #16a34a;
  --color-success-bg: #f0fdf4;
  --color-warning: #c4960c;
  --color-warning-bg: #fffbeb;
  --color-warning-border: #f0d078;
  --goldl: #fffbeb;
  --bg: var(--color-warm);
```

- [ ] **Step 2: Add dark mode overrides for new vars**

Inside the `[data-theme="dark"]` block (after line 400), add:

```css
  --color-danger-bg: #1f1215;
  --color-danger-border: #5c2020;
  --color-success: #4ade80;
  --color-success-bg: #0f1f15;
  --color-warning: #f0d078;
  --color-warning-bg: #1f1a0f;
  --color-warning-border: #5c4a1a;
  --goldl: #1f1a0f;
  --bg: var(--color-warm);
```

- [ ] **Step 3: Add visible focus styles for all interactive elements**

After the input focus styles (line 75), add:

```css
button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.pill:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Add prefers-reduced-motion**

At the end of `global.css`, add:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Add select dropdown arrow**

After line 78 (`appearance: none;`), add:

```css
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237c8590' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
```

- [ ] **Step 6: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/lib/global.css
git commit -m "fix: design system — missing CSS vars, dark mode, focus styles, reduced-motion, select arrow"
```

---

### Task 6: Replace hardcoded colors across components

**Files:**
- Modify: `src/pages/Auth.jsx` (lines 317, 327)
- Modify: `src/pages/tabs/MoneyTab.jsx` (lines 92, 114, 121)
- Modify: `src/pages/tabs/ScheduleTab.jsx` (lines 91, 227)
- Modify: `src/pages/Hub.jsx` (line 244)
- Modify: `src/pages/AdminDashboard.jsx` (lines 61, 193, 210)

- [ ] **Step 1: Fix Auth.jsx hardcoded colors**

```js
// Line 317: password mismatch
// OLD: color: '#dc2626'
// NEW: color: 'var(--color-danger)'

// Line 327: password match
// OLD: color: '#16a34a'
// NEW: color: 'var(--color-success)'
```

- [ ] **Step 2: Fix MoneyTab.jsx hardcoded colors**

```js
// Line 92: Paid stat
// OLD: color: "#16a34a"
// NEW: color: "var(--color-success)"

// Line 114: overdue border
// OLD: border: "1px solid #f0d078"
// NEW: border: "1px solid var(--color-warning-border)"

// Line 121: paid border
// OLD: border: "1px solid #c8e6c9"
// NEW: border: "1px solid var(--color-success)"
```

- [ ] **Step 3: Fix ScheduleTab.jsx hardcoded colors**

```js
// Lines 91, 227: holiday names
// OLD: color: "#b8860b"
// NEW: color: "var(--color-warning)"
```

- [ ] **Step 4: Fix Hub.jsx onboarding banner border**

```js
// Line 244
// OLD: border: "1px solid #f0d078"
// NEW: border: "1px solid var(--color-warning-border)"
```

- [ ] **Step 5: Fix AdminDashboard.jsx hardcoded vars**

```js
// Line 61, 193, 210: var(--bg) (now defined)
// Line 61: var(--goldl) (now defined)
// No changes needed — these CSS vars are now defined in global.css
```

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: Both pass

- [ ] **Step 7: Commit**

```bash
git add src/pages/Auth.jsx src/pages/tabs/MoneyTab.jsx src/pages/tabs/ScheduleTab.jsx src/pages/Hub.jsx
git commit -m "fix: replace hardcoded colors with CSS variables for dark mode"
```

---

## Chunk 4: Touch Targets & Accessibility (1 hr)

### Task 7: Fix touch targets in Hub header

**Files:**
- Modify: `src/pages/Hub.jsx:225-237`

- [ ] **Step 1: Enlarge notification bell touch target**

Line 225, wrap the bell SVG in a properly sized button:

```jsx
// OLD (lines 225-227)
<div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowNotifs(!showNotifs)}>
  <svg width="20" height="20" ...>

// NEW
<button
  onClick={() => setShowNotifs(!showNotifs)}
  aria-label={"Notifications" + (notifications.filter(n => !n.read_at).length > 0 ? ` (${notifications.filter(n => !n.read_at).length} unread)` : "")}
  style={{ position: "relative", cursor: "pointer", background: "none", border: "none", padding: 12, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
>
  <svg width="20" height="20" ...>
```

Close the `<button>` instead of `</div>`.

- [ ] **Step 2: Enlarge profile avatar**

Line 229:

```jsx
// OLD
<button onClick={...} style={{ width: 30, height: 30, ...}}>

// NEW
<button onClick={...} aria-label="Settings" style={{ width: 44, height: 44, ...}}>
```

Adjust inner font size/padding if needed.

- [ ] **Step 3: Enlarge tab bar buttons**

Line 237, increase padding:

```jsx
// OLD
padding: "8px 0 6px", fontSize: 10,

// NEW
padding: "10px 0 8px", fontSize: 11,
```

Add `aria-selected` and `role`:

```jsx
// Add to each tab button:
role="tab"
aria-selected={tab === t.id}
```

And wrap the tab container (line 236) with:

```jsx
<div ... role="tablist" aria-label="Main navigation">
```

- [ ] **Step 4: Add aria-pressed to filter pills**

Line 233:

```jsx
// Add to each pill button:
aria-pressed={filter === m.id}
```

- [ ] **Step 5: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/pages/Hub.jsx
git commit -m "a11y: touch targets 44px, ARIA roles on tabs/pills/buttons"
```

---

### Task 8: Make dark mode toggle accessible

**Files:**
- Modify: `src/pages/tabs/SettingsTab.jsx:41-45`

- [ ] **Step 1: Replace div toggle with semantic button**

```jsx
// OLD (lines 41-45)
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--color-border)" }}>
  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>Dark mode</span>
  <div onClick={() => setDarkMode(!darkMode)} style={{ width: 48, height: 28, ... }}>
    <div style={{ width: 22, height: 22, ... }} />
  </div>
</div>

// NEW
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--color-border)" }}>
  <span id="dark-mode-label" style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>Dark mode</span>
  <button
    role="switch"
    aria-checked={darkMode}
    aria-labelledby="dark-mode-label"
    onClick={() => setDarkMode(!darkMode)}
    style={{ width: 48, height: 28, borderRadius: 14, background: darkMode ? "var(--color-accent)" : "var(--color-border)", cursor: "pointer", position: "relative", transition: "background .2s", border: "none", padding: 0, minWidth: 48, minHeight: 28 }}
  >
    <div style={{ width: 22, height: 22, borderRadius: 11, background: "#fff", position: "absolute", top: 3, left: darkMode ? 23 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
  </button>
</div>
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/tabs/SettingsTab.jsx
git commit -m "a11y: dark mode toggle — semantic button with role=switch"
```

---

## Chunk 5: UX Quick Wins (1.5 hrs)

### Task 9: Add confirmation dialogs for destructive actions

**Files:**
- Modify: `src/components/modals/EventDetailModal.jsx:125`
- Modify: `src/pages/tabs/MoneyTab.jsx` (not-renewing button)
- Modify: `src/pages/tabs/ExploreTab.jsx` (delete location)

- [ ] **Step 1: Add confirmation to event deletion**

In `EventDetailModal.jsx`, line 125, wrap the delete in a confirm:

```jsx
// OLD
{(isManual||(isRecurring&&!event.skipped))&&<button onClick={()=>{onDelete(event);onClose()}} ...>

// NEW
{(isManual||(isRecurring&&!event.skipped))&&<button onClick={()=>{
  if(window.confirm(isRecurring?"Skip this week?":"Remove this event? This can't be undone.")){
    onDelete(event);onClose();
  }
}} ...>
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/EventDetailModal.jsx
git commit -m "ux: add confirmation before deleting events"
```

---

### Task 10: Fix MoneyTab duplicate summary

**Files:**
- Modify: `src/pages/tabs/MoneyTab.jsx`

- [ ] **Step 1: Read MoneyTab.jsx fully to identify the duplicate sections**

Read: `src/pages/tabs/MoneyTab.jsx`

- [ ] **Step 2: Remove the second summary grid (Outstanding/Paid duplicate)**

Remove the 2-column grid section that duplicates the 3-column summary above it. Keep the overdue alert between them. The exact lines will depend on the current file — look for the second instance of "Outstanding" and "Paid" summary cards after the overdue alert.

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/pages/tabs/MoneyTab.jsx
git commit -m "ux: remove duplicate money summary section"
```

---

### Task 11: Fix "Add a club" ejecting from hub

**Files:**
- Create: `src/components/modals/AddClubModal.jsx`
- Modify: `src/pages/Hub.jsx`

- [ ] **Step 1: Create a lightweight in-hub AddClubModal**

Create `src/components/modals/AddClubModal.jsx` that reuses the club search pattern from `OnboardClubs.jsx` but wrapped in `OcvModal`. This should:
- Accept `userId`, `kids`, `onClose`, `onSaved` props
- Show a search input that queries the `clubs` table
- Display matching clubs as tappable cards
- On tap, show "Who goes?" multi-select (all kids + self)
- On confirm, insert into `hub_subscriptions` and call `onSaved()`

Key code pattern — search clubs:
```jsx
const results = await db("clubs", "GET", {
  filters: ["name.ilike.*" + encodeURIComponent(query) + "*"],
  select: "id,name,address,location",
  limit: 20,
});
```

- [ ] **Step 2: Wire AddClubModal into Hub.jsx**

Replace `onRefresh("clubs")` calls in Hub.jsx (lines 250, 268, 315) with opening the new modal:

```jsx
// Add state
const [showAddClub, setShowAddClub] = useState(false);

// Replace onRefresh("clubs") calls with:
setShowAddClub(true)

// Add modal render (near other modals):
{showAddClub && <AddClubModal userId={user.id} kids={kids} onClose={() => setShowAddClub(false)} onSaved={() => { setShowAddClub(false); load(); }} />}
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/AddClubModal.jsx src/pages/Hub.jsx
git commit -m "ux: in-hub Add Club modal — no longer ejects to onboarding"
```

---

## Chunk 6: Error Handling & Reliability (30 min)

### Task 12: Fix silent error swallowing

**Files:**
- Modify: `src/components/modals/AddKidModal.jsx`
- Modify: `src/lib/supabase.js:63`
- Modify: `src/pages/Auth.jsx` (silent family creation failure)

- [ ] **Step 1: Fix empty catch blocks in AddKidModal**

Search for `catch (e) {}` or `catch(e){}` in AddKidModal.jsx. Replace each with:

```js
catch (e) { console.error("AddKidModal error:", e); }
```

- [ ] **Step 2: Fix refreshToken silent swallow**

In `src/lib/supabase.js`, line 63:

```js
// OLD
catch (e) { /* noop */ }

// NEW
catch (e) { console.error("Token refresh failed:", e); }
```

- [ ] **Step 3: Fix silent family creation in Auth.jsx**

Find the `// Silently fail if family creation fails` comment. Replace:

```js
// OLD
catch(e){ /* Silently fail if family creation fails */ }

// NEW
catch(e){ console.error("Family creation failed:", e); showToast("Account created, but family setup had an issue. Contact support if needed.", "info"); }
```

- [ ] **Step 4: Build and test**

Run: `npm run build && npm test`
Expected: Both pass

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/AddKidModal.jsx src/lib/supabase.js src/pages/Auth.jsx
git commit -m "fix: replace silent error swallowing with logging and user feedback"
```

---

## Chunk 7: Final Polish (30 min)

### Task 13: Add hash-based routing for back button support

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add hash-based screen mapping**

At the top of `App()`, after the state declarations, add:

```jsx
// Sync screen state with URL hash for back button support
useEffect(() => {
  const screenToHash = { landing: '', auth_signup: 'signup', auth_login: 'login', onboard_kids: 'onboard', hub: 'app' };
  const hash = screenToHash[screen];
  if (hash !== undefined && window.location.hash !== '#/' + hash) {
    window.history.pushState(null, '', hash ? '#/' + hash : window.location.pathname);
  }
}, [screen]);

useEffect(() => {
  const onPop = () => {
    const hash = window.location.hash.replace('#/', '');
    if (hash === 'app') setScreen('hub');
    else if (hash === 'login') setScreen('auth_login');
    else if (hash === 'signup') setScreen('auth_signup');
    else if (hash === '' && screen !== 'loading') setScreen('landing');
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}, [screen]);
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "ux: hash-based routing for browser/Android back button support"
```

---

### Task 14: Update graphify index and run final verification

- [ ] **Step 1: Run full build and test suite**

```bash
cd ~/oneclubview && npm run build && npm test
```

- [ ] **Step 2: Update the knowledge graph**

```bash
/c/Users/dfay/AppData/Local/pipx/pipx/venvs/graphifyy/Scripts/python.exe -m graphify update .
```

- [ ] **Step 3: Final commit for CLAUDE.md if needed**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with current architecture"
```

---

## Summary

| Chunk | Tasks | Estimated Time | Key Fixes |
|-------|-------|---------------|-----------|
| 1 | 1-3 | 30 min | isAdmin default, admin gating, stale weekDates |
| 2 | 4 | 30 min | Modal scroll lock, Escape, ARIA, close button |
| 3 | 5-6 | 1 hr | CSS vars, dark mode, focus styles, reduced-motion |
| 4 | 7-8 | 1 hr | Touch targets 44px, ARIA tabs/pills, toggle switch |
| 5 | 9-11 | 1.5 hrs | Delete confirmation, money dedup, in-hub Add Club |
| 6 | 12 | 30 min | Error handling across AddKid, supabase, Auth |
| 7 | 13-14 | 30 min | Hash routing for back button, final verification |

**Total: 14 tasks, ~5 hours of implementation**

Dependencies: Chunk 1 must go first (security). Chunks 2-6 are independent and can be parallelized with subagents. Chunk 7 goes last.
