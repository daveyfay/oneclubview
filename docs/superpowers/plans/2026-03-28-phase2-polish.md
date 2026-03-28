# Phase 2 — Polish: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OneClubView production-ready: GDPR-compliant account deletion, consistent modal UX, per-tab loading states, full dark mode coverage, typography consistency, skip-week undo, and admin dashboard security.

**Architecture:** Each task is independent — modals, dark mode, loading states, and features can be worked on in any order. Account deletion requires a new Supabase Edge Function. All other changes are frontend-only.

**Tech Stack:** React 19, Vite 8, Vitest, Supabase Edge Functions (Deno/TypeScript), PostgREST

**Priority order:** GDPR account deletion → modal standardization → loading states → dark mode → typography → remaining features (skip-week undo, admin RLS)

---

## File Structure

### New files to create:
| File | Responsibility |
|------|---------------|
| `supabase/functions/delete-account/index.ts` | Edge function: server-side account deletion within 30 days |

### Files to modify:
| File | Changes |
|------|---------|
| `src/pages/tabs/SettingsTab.jsx` | Wire up real deletion endpoint, add skip-week undo UI |
| `src/components/modals/AddEventModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/AddPaymentModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/AddKidModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/AddActivityModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/AddPlaydateModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/EditClubModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/EditHolidayModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/AddHolidayModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/SupportModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/InviteAdultModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/PasteScheduleModal.jsx` | Migrate to OcvModal wrapper |
| `src/components/modals/EventDetailModal.jsx` | Migrate to OcvModal wrapper, add un-skip button |
| `src/components/modals/OcvModal.jsx` | Add footer slot prop, fix dark mode backdrop |
| `src/pages/tabs/OverviewTab.jsx` | Add per-tab loading skeleton |
| `src/pages/tabs/ScheduleTab.jsx` | Add per-tab loading skeleton |
| `src/pages/tabs/MoneyTab.jsx` | Add per-tab loading skeleton |
| `src/pages/tabs/ExploreTab.jsx` | Add per-tab loading skeleton |
| `src/lib/global.css` | Add dark mode fixes for hardcoded colors, add `--color-danger` var |
| `src/pages/AdminDashboard.jsx` | Add admin role verification, scope queries |
| `src/components/ErrorBoundary.jsx` | Fix old CSS variable references |

---

## Task 1: GDPR Account Deletion — Edge Function

**Files:**
- Create: `supabase/functions/delete-account/index.ts`
- Modify: `src/pages/tabs/SettingsTab.jsx`

- [ ] **Step 1: Create the delete-account edge function**

Create `supabase/functions/delete-account/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the user from their JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const userId = user.id;
    const userEmail = user.email;

    // Delete user data in order (respecting foreign keys)
    // 1. Events and bookings
    await supabase.from("manual_events").delete().eq("user_id", userId);
    await supabase.from("recurring_events").delete().eq("user_id", userId);
    await supabase.from("camp_bookings").delete().eq("user_id", userId);
    await supabase.from("payment_reminders").delete().eq("user_id", userId);

    // 2. Family and locations
    await supabase.from("family_locations").delete().eq("user_id", userId);
    await supabase.from("family_invites").delete().eq("invited_by", userId);
    await supabase.from("hub_subscriptions").delete().eq("user_id", userId);

    // 3. User school holidays
    await supabase.from("user_school_holidays").delete().eq("user_id", userId);

    // 4. Inbound messages
    await supabase.from("inbound_messages").delete().eq("user_id", userId);

    // 5. Dependants
    await supabase.from("dependants").delete().eq("parent_user_id", userId);

    // 6. Profile
    await supabase.from("profiles").delete().eq("id", userId);

    // 7. Delete auth user
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
    if (deleteErr) console.error("Auth delete failed:", deleteErr);

    // 8. Send confirmation email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && userEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "OneClubView <hello@oneclubview.com>",
          to: userEmail,
          subject: "Your OneClubView account has been deleted",
          html: `<p>Hi,</p><p>Your OneClubView account and all associated data have been permanently deleted as requested.</p><p>If you didn't request this, please contact hello@oneclubview.com immediately.</p><p>— The OneClubView Team</p>`,
        }),
      });
    }

    return new Response(JSON.stringify({ status: "deleted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
```

- [ ] **Step 2: Deploy the edge function**

```bash
supabase functions deploy delete-account --no-verify-jwt
```

Note: We use `--no-verify-jwt` because the function does its own JWT verification to get the user ID. The function requires `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` secrets (already set).

- [ ] **Step 3: Update SettingsTab.jsx to call the real endpoint**

In `src/pages/tabs/SettingsTab.jsx`, find the account deletion confirm handler (the `onConfirm` of the delete account OcvConfirm). Replace the email-only logic with:

```jsx
onConfirm={async () => {
  try {
    const token = getToken();
    const res = await fetch(SB + "/functions/v1/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    });
    const data = await res.json();
    if (data.status === "deleted") {
      showToast("Account deleted. Goodbye!");
      onLogout();
    } else {
      showToast("Something went wrong. Please email hello@oneclubview.com", "err");
    }
  } catch (e) {
    showToast("Something went wrong. Please email hello@oneclubview.com", "err");
  }
}}
```

Also add the import at the top of SettingsTab.jsx if not present:

```jsx
import { SB, getToken } from '../../lib/supabase';
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/delete-account/index.ts src/pages/tabs/SettingsTab.jsx
git commit -m "feat: GDPR-compliant server-side account deletion via edge function"
```

---

## Task 2: Enhance OcvModal with Footer Slot and Dark Mode Fix

Before migrating modals, improve the OcvModal wrapper to support action buttons and fix the dark mode backdrop.

**Files:**
- Modify: `src/components/modals/OcvModal.jsx`
- Modify: `src/lib/global.css`

- [ ] **Step 1: Read current OcvModal.jsx**

Read `src/components/modals/OcvModal.jsx` to understand its current structure.

- [ ] **Step 2: Add footer prop and fix dark mode**

Update OcvModal to accept an optional `footer` prop (rendered after children) and replace any hardcoded backdrop colors with CSS variables:

The component should render:
```jsx
{open && (
  <div className="modal-backdrop modal-overlay" onClick={onClose}>
    <div className="modal-box modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: width || 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 800, color: 'var(--color-primary)' }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--color-muted)', cursor: 'pointer', padding: '4px' }}>{'\u00D7'}</button>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 120px)' }}>
        {children}
      </div>
      {footer && <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>{footer}</div>}
    </div>
  </div>
)}
```

- [ ] **Step 3: Add --color-danger CSS variable**

In `src/lib/global.css`, add to `:root`:
```css
--color-danger: #dc2626;
```

And in `[data-theme="dark"]`:
```css
--color-danger: #ef4444;
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/OcvModal.jsx src/lib/global.css
git commit -m "feat: enhance OcvModal with footer slot, fix dark mode backdrop, add --color-danger"
```

---

## Task 3: Migrate Modals to OcvModal (Batch 1 — Simple Modals)

Migrate the simpler modals first: AddPaymentModal, AddHolidayModal, EditHolidayModal, SupportModal, InviteAdultModal.

**Files:**
- Modify: `src/components/modals/AddPaymentModal.jsx`
- Modify: `src/components/modals/AddHolidayModal.jsx`
- Modify: `src/components/modals/EditHolidayModal.jsx`
- Modify: `src/components/modals/SupportModal.jsx`
- Modify: `src/components/modals/InviteAdultModal.jsx`

- [ ] **Step 1: Read each modal file to understand current structure**

Read all 5 files. For each, note: the title text, the body content, the action buttons, and any custom close logic.

- [ ] **Step 2: Migrate each modal**

For each modal, replace the custom `<div className="modal-backdrop">` / `<div className="modal-box">` wrapper with `<OcvModal>`:

Pattern:
```jsx
// Before:
return <>
  <div className="modal-backdrop modal-overlay" onClick={onClose}>
    <div className="modal-box modal-sheet" onClick={e => e.stopPropagation()}>
      <h3>Title</h3>
      {/* body */}
      <button>Save</button>
    </div>
  </div>
</>;

// After:
return (
  <OcvModal open={true} onClose={onClose} title="Title"
    footer={<button className="btn btn-primary" onClick={handleSave}>Save</button>}>
    {/* body only */}
  </OcvModal>
);
```

Add `import { OcvModal } from './index';` (or from the appropriate path) to each file if not already imported.

- [ ] **Step 3: Verify build and test each modal opens correctly**

```bash
npm run build
```

Then manually verify at least one modal still opens/closes/saves correctly.

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/AddPaymentModal.jsx src/components/modals/AddHolidayModal.jsx src/components/modals/EditHolidayModal.jsx src/components/modals/SupportModal.jsx src/components/modals/InviteAdultModal.jsx
git commit -m "refactor: migrate 5 simple modals to OcvModal wrapper"
```

---

## Task 4: Migrate Modals to OcvModal (Batch 2 — Complex Modals)

Migrate the larger modals: AddEventModal, AddKidModal, AddActivityModal, AddPlaydateModal, EditClubModal, PasteScheduleModal, EventDetailModal.

**Files:**
- Modify: `src/components/modals/AddEventModal.jsx`
- Modify: `src/components/modals/AddKidModal.jsx`
- Modify: `src/components/modals/AddActivityModal.jsx`
- Modify: `src/components/modals/AddPlaydateModal.jsx`
- Modify: `src/components/modals/EditClubModal.jsx`
- Modify: `src/components/modals/PasteScheduleModal.jsx`
- Modify: `src/components/modals/EventDetailModal.jsx`

- [ ] **Step 1: Read each modal file**

Read all 7 files. These are larger (200-565 lines) so pay attention to multi-step wizards (PasteScheduleModal) and complex state (EditClubModal with color picker).

- [ ] **Step 2: Migrate each modal**

Same pattern as Task 3 — replace custom modal markup with OcvModal wrapper. For multi-step modals (PasteScheduleModal), the footer buttons change per step — pass a dynamic footer.

For EventDetailModal specifically: this renders as a slide-up panel, not a centered modal. Check if it should stay as a custom implementation or adapt OcvModal for slide-up behavior.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/AddEventModal.jsx src/components/modals/AddKidModal.jsx src/components/modals/AddActivityModal.jsx src/components/modals/AddPlaydateModal.jsx src/components/modals/EditClubModal.jsx src/components/modals/PasteScheduleModal.jsx src/components/modals/EventDetailModal.jsx
git commit -m "refactor: migrate 7 complex modals to OcvModal wrapper"
```

---

## Task 5: Per-Tab Loading Skeletons

Add loading skeleton states to each tab component so users see shimmer placeholders while data loads.

**Files:**
- Modify: `src/pages/tabs/OverviewTab.jsx`
- Modify: `src/pages/tabs/ScheduleTab.jsx`
- Modify: `src/pages/tabs/MoneyTab.jsx`
- Modify: `src/pages/tabs/ExploreTab.jsx`

- [ ] **Step 1: Read the Hub.jsx skeleton pattern**

Read `src/pages/Hub.jsx` lines 112-163 to see the existing skeleton shimmer pattern. The CSS class `skeleton-shimmer` is already defined in global.css.

- [ ] **Step 2: Add loading check to each tab**

At the top of each tab's render, before the main content, add a loading guard:

```jsx
const { loading, /* ...other data */ } = useHubData();

if (loading) return (
  <div style={{ padding: '4px 0' }}>
    {/* Tab-specific skeleton matching that tab's layout */}
    <div className="skeleton-shimmer" style={{ width: '100%', height: 120, borderRadius: 16, marginBottom: 12 }} />
    <div className="skeleton-shimmer" style={{ width: '60%', height: 16, borderRadius: 6, marginBottom: 8 }} />
    <div className="skeleton-shimmer" style={{ width: '100%', height: 80, borderRadius: 12, marginBottom: 8 }} />
    <div className="skeleton-shimmer" style={{ width: '100%', height: 80, borderRadius: 12 }} />
  </div>
);
```

Customize each tab's skeleton to match its layout:
- **OverviewTab**: 2x2 stat grid skeleton + clubs list
- **ScheduleTab**: Day pills row + event list rows
- **MoneyTab**: Summary card + fee list rows
- **ExploreTab**: Subtab pills + card list

- [ ] **Step 3: Remove the Hub-level full-page skeleton**

In `src/pages/Hub.jsx`, the `if(loading)` block (lines ~112-163) shows a full-page skeleton. This should be simplified to just show the header skeleton (tab bar + pills) while tabs handle their own loading. OR keep the Hub skeleton for the initial load and add tab skeletons for subsequent reloads.

Recommended: Keep Hub skeleton for first load only (when `loading && kids.length === 0`). For reloads (load() after save), tabs show their own skeletons.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/tabs/OverviewTab.jsx src/pages/tabs/ScheduleTab.jsx src/pages/tabs/MoneyTab.jsx src/pages/tabs/ExploreTab.jsx src/pages/Hub.jsx
git commit -m "feat: add per-tab loading skeletons with shimmer animation"
```

---

## Task 6: Dark Mode Coverage Pass

Audit and fix hardcoded colors across the app. Focus on the most impactful files.

**Files:**
- Modify: `src/pages/Hub.jsx`
- Modify: `src/pages/tabs/ScheduleTab.jsx`
- Modify: `src/pages/tabs/MoneyTab.jsx`
- Modify: `src/pages/tabs/SettingsTab.jsx`
- Modify: `src/pages/tabs/OverviewTab.jsx`
- Modify: `src/pages/tabs/ExploreTab.jsx`
- Modify: `src/pages/AdminDashboard.jsx`
- Modify: `src/pages/Auth.jsx`
- Modify: `src/components/modals/OcvModal.jsx`
- Modify: `src/components/modals/OcvInput.jsx`
- Modify: `src/components/modals/OcvConfirm.jsx`
- Modify: `src/components/ErrorBoundary.jsx`
- Modify: `src/lib/global.css`

- [ ] **Step 1: Fix core modal backdrop colors**

In OcvModal.jsx, OcvInput.jsx, and OcvConfirm.jsx — replace any hardcoded `rgba(10,15,20,.45)` or `rgba(10,15,20,.5)` backdrop colors. These are already using the `modal-backdrop` class from global.css, so remove any inline backdrop overrides.

- [ ] **Step 2: Fix ErrorBoundary old variable names**

In `src/components/ErrorBoundary.jsx`, replace:
- `var(--sn, ...)` → `var(--font-sans)`
- `var(--sr, ...)` → `var(--font-serif)`
- `var(--g, ...)` → `var(--color-primary)`
- `var(--warm, ...)` → `var(--color-warm)`
- `var(--tx, ...)` → `var(--color-text)`
- `var(--mt, ...)` → `var(--color-muted)`

- [ ] **Step 3: Replace hardcoded whites in Hub and tab components**

Search for `'#fff'` and `background: 'white'` in inline styles. Replace with `var(--color-card)` where it's a card/panel background, or keep `#fff` where it's text on a dark background (like white text on a primary-color button — those are intentional).

Key replacements:
- Card/panel backgrounds: `'#fff'` → `'var(--color-card)'`
- Notification panel: `background: '#fff'` → `background: 'var(--color-card)'`
- FAB bottom sheet: `background: '#fff'` → `background: 'var(--color-card)'`
- Status/success colors (`#16a34a`, `#c4960c`): Keep as-is (these are semantic, not theme colors)
- Delete/danger colors (`#dc2626`): Replace with `var(--color-danger)`

- [ ] **Step 4: Add dark mode overrides for remaining hardcoded patterns**

In `src/lib/global.css`, add dark mode overrides for common patterns that can't be CSS-var-ified (like semi-transparent overlays):

```css
[data-theme="dark"] .notification-panel,
[data-theme="dark"] .fab-sheet {
  background: var(--color-card);
  border-color: var(--color-border);
}
```

- [ ] **Step 5: Verify build and visual check in dark mode**

```bash
npm run build && npm run dev
```

Toggle dark mode and check: Hub header, all tab content, modals, FAB sheet, notification panel.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: dark mode coverage — replace hardcoded colors with CSS variables"
```

---

## Task 7: Typography Consistency Pass

Ensure consistent font usage: Fraunces for headings, Plus Jakarta Sans for body, add --font-mono.

**Files:**
- Modify: `src/lib/global.css`
- Modify: `src/components/ErrorBoundary.jsx`
- Modify: `src/components/modals/SupportModal.jsx`
- Modify: `src/pages/AdminDashboard.jsx`
- Modify: `src/pages/tabs/ScheduleTab.jsx`

- [ ] **Step 1: Add --font-mono CSS variable**

In `src/lib/global.css` `:root`, add:
```css
--font-mono: 'SF Mono', 'Fira Code', 'Courier New', monospace;
```

And in `[data-theme="dark"]` (same value — monospace doesn't change with theme):
```css
--font-mono: 'SF Mono', 'Fira Code', 'Courier New', monospace;
```

- [ ] **Step 2: Replace hardcoded monospace**

In SupportModal.jsx, AdminDashboard.jsx, and ScheduleTab.jsx — replace `fontFamily: "monospace"` with `fontFamily: "var(--font-mono)"`.

- [ ] **Step 3: Fix ErrorBoundary font references**

Already handled in Task 6 Step 2, but verify. ErrorBoundary should use `var(--font-sans)` and `var(--font-serif)` without fallbacks (the CSS variables already have fallbacks in global.css).

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/global.css src/components/ErrorBoundary.jsx src/components/modals/SupportModal.jsx src/pages/AdminDashboard.jsx src/pages/tabs/ScheduleTab.jsx
git commit -m "refactor: typography consistency — add --font-mono, standardize font references"
```

---

## Task 8: Skip-Week Undo UI

Add UI to view and remove excluded dates from recurring events.

**Files:**
- Modify: `src/components/modals/EventDetailModal.jsx`
- Modify: `src/pages/tabs/ScheduleTab.jsx`

- [ ] **Step 1: Read EventDetailModal.jsx**

Read the full file to understand how events are displayed and how delete/skip works.

- [ ] **Step 2: Add un-skip button to EventDetailModal**

When viewing a skipped event (the event object has `skipped: true`), show an "Un-skip this week" button instead of the regular action buttons:

```jsx
{event.skipped && event.source_type === "recurring" && (
  <button
    className="btn btn-primary"
    onClick={async () => {
      const dateStr = event.date.toISOString().split("T")[0];
      // Fetch current excluded_dates, remove this date
      const rec = await db("recurring_events", "GET", { filters: ["id=eq." + event.source_id] });
      if (rec && rec[0]) {
        const updated = (rec[0].excluded_dates || []).filter(d => d !== dateStr);
        await db("recurring_events", "PATCH", {
          filters: ["id=eq." + event.source_id],
          body: { excluded_dates: updated },
        });
        showToast("Week restored!");
        load();
        onClose();
      }
    }}
  >
    Restore this week
  </button>
)}
```

- [ ] **Step 3: Show skipped events with visual indicator in ScheduleTab**

In ScheduleTab.jsx, skipped events should render with reduced opacity and a strikethrough or "skipped" badge, plus be tappable to open EventDetailModal where un-skip is available.

Check if skipped events are currently filtered out or shown. If filtered out, change to show them with visual treatment:

```jsx
style={{
  opacity: e.skipped ? 0.4 : 1,
  textDecoration: e.skipped ? 'line-through' : 'none',
}}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/EventDetailModal.jsx src/pages/tabs/ScheduleTab.jsx
git commit -m "feat: add skip-week undo UI — restore excluded dates from recurring events"
```

---

## Task 9: Admin Dashboard RLS Gating

Secure the admin dashboard with proper role verification and scoped queries.

**Files:**
- Modify: `src/pages/AdminDashboard.jsx`

- [ ] **Step 1: Read AdminDashboard.jsx**

Read the full file to understand all queries and data displayed.

- [ ] **Step 2: Add role verification before data load**

At the top of the component's data loading, verify the user is actually an admin:

```jsx
async function loadAdmin() {
  // Verify admin role server-side (don't trust client profile)
  const profileCheck = await db("profiles", "GET", {
    filters: ["id=eq." + user.id],
    select: "family_role",
  });
  if (!profileCheck?.[0] || profileCheck[0].family_role !== "admin") {
    showToast("Access denied", "err");
    onBack();
    return;
  }
  // ... proceed with admin queries
}
```

- [ ] **Step 3: Scope queries where possible**

For queries that should be scoped (e.g., support_tickets), add appropriate filters. For truly admin-wide queries (all profiles for user count), these rely on RLS — which is correct. But add a comment explaining the RLS dependency:

```jsx
// Relies on RLS admin_read_all policy — verify in Supabase dashboard
const u = await db("profiles", "GET", { select: "id,email,first_name,subscription_status,family_role,created_at", order: "created_at.desc", limit: 50 });
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminDashboard.jsx
git commit -m "security: add admin role verification and scoped queries to dashboard"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Build for production**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Manual smoke test checklist**

Run `npm run dev` and verify:
1. Login works (no crash)
2. All 5 tabs render with loading skeletons on first load
3. Dark mode toggle — check every tab, FAB, notification panel, modals
4. Open at least 3 different modals — verify consistent header/body/footer
5. Skip a week on a recurring event, then un-skip it
6. Account deletion flow (test with a throwaway account or verify the button triggers the edge function)
7. Admin dashboard loads only for admin users

- [ ] **Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "chore: Phase 2 Polish complete"
```
