# OneClubView Surgical Refactor — Design Spec

**Date:** 2026-03-28
**Author:** Claude (Technical Lead)
**Approver:** Dave (Product Owner)
**Status:** Approved

## Context

OneClubView is a family activity hub (React 19 + Vite 8 + Supabase) at oneclubview.com. The core product works and has a handful of beta users. Before a growth push, the codebase needs structural improvements across code quality, UX consistency, performance, security, and infrastructure.

Dave operates as hands-off product owner. Claude handles all technical decisions, design, and implementation end-to-end. Dave reviews and approves.

## Approach: Surgical Refactor

Incremental improvement in 3 phases. No big bang rewrite. The app stays deployable and functional throughout. Each phase produces measurable improvements.

---

## Audit Findings

### Architecture & Code Quality

1. **Hub.jsx is a god component** — 1,492 lines, 40+ useState hooks, handles all 5 tabs, data fetching, geolocation, modals, pull-to-refresh, dark mode. Root cause of most recurring bugs.
2. **No state management pattern** — 40+ independent useState calls. Data fetched redundantly, passed through deep prop chains, gets out of sync.
3. **Cryptic CSS variable names** — `--g`, `--gl`, `--acc`, `--mt`, `--bd`, `--sr`, `--sn` and class names `.bp`, `.bs`, `.pon`, `.poff` are unreadable and unmaintainable.
4. **Zero test coverage** — No testing framework installed. No tests of any kind.
5. **Duplicated Supabase logic** — `db()`/`au()`/`rpc()` wrappers exist but components still inline complex query logic.
6. **Inconsistent modal patterns** — 12+ modals with varying structures, state management, and styling approaches.
7. **No error boundary** — One component crash = white screen for the user.

### UX & Design Consistency

1. **Mixed styling approach** — Some components use global.css classes, others are fully inline. Hard to maintain visual consistency.
2. **Typography inconsistency** — Fraunces (serif) for headings is inconsistently applied; some headings use sans-serif.
3. **Dark mode coverage gaps** — global.css handles base elements but inline styles don't respect theme variables.
4. **No loading states** — Skeleton loaders were added then reverted. Content pops in suddenly.
5. **Desktop-neglected** — 900px+ just centers a 600px column with no expanded layout.
6. **Color palette is solid** — Navy (#1a2a3a), Coral (#e85d4a), Sage (#e8f0e8), Warm (#f8f6f3) work well together. The foundation is good; the application is inconsistent.

### Performance

1. **No code splitting** — Everything loads upfront regardless of which tab the user visits.
2. **Redundant API calls** — Hub.jsx fetches all data on mount. Each tab switch re-renders everything.
3. **No data caching** — Same Supabase queries fire on every tab switch and page revisit.
4. **Client-side distance calculations** — 230+ club distances computed repeatedly instead of cached.

### Security

1. **Admin dashboard leaks data** — Known issue, needs proper RLS gating.
2. **Account deletion is fake** — Currently emails admin. GDPR requires actual data removal.
3. **RLS is solid overall** — `get_my_family_user_ids()` pattern is well implemented. No USING(true) on sensitive tables.
4. **Token refresh works** — Sessions survive 1hr access token expiry.

### Infrastructure

1. **No CI/CD pipeline** — No automated tests, lint, or build verification before deploy.
2. **No error monitoring** — App crashes are invisible. No Sentry or equivalent.
3. **Unused edge functions** — `discover-nearby` (not used by frontend), `weekly-digest` (disabled).

---

## Phase 1 — Foundation

**Goal:** Stop the bleeding. Make the codebase maintainable and testable.

### 1.1 Decompose Hub.jsx

Break the 1,492-line god component into:

- **Hub.jsx** — Thin shell (~200 lines). Tab routing, header, FAB button, shared layout.
- **OverviewTab.jsx** — Stats tiles, quick actions.
- **ScheduleTab.jsx** — Week grid, calendar month view, event management.
- **MoneyTab.jsx** — Payment reminders, tracking, mark-paid.
- **ExploreTab.jsx** — Camps, nearby clubs, things to do.
- **SettingsTab.jsx** — Profile, family, locations, dark mode, account management.

### 1.2 Shared State via React Context + Custom Hooks

Replace 40+ useState hooks with context providers and custom hooks:

- **`FamilyProvider` / `useFamily()`** — Kids, family members, invites, roles.
- **`ScheduleProvider` / `useSchedule()`** — Recurring events, manual events, excluded dates.
- **`ClubsProvider` / `useClubs()`** — Club subscriptions, club data, colors.
- **`PaymentsProvider` / `usePayments()`** — Payment reminders, paid status.
- **`LocationProvider` / `useLocation()`** — User location, family locations, distance calculations.
- **`AuthProvider` / `useAuth()`** — Session, token refresh, user profile.

Each hook owns its data fetching, caching, and mutations. Components consume via hooks, never fetch directly.

### 1.3 Semantic CSS Variables

Rename all CSS variables and class names:

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
| `.bp` | `.btn-primary` |
| `.bs` | `.btn-secondary` |
| `.pon` | `.pill-active` |
| `.poff` | `.pill-inactive` |
| `.lbl` | `.label` |
| `.mbg` | `.modal-backdrop` |
| `.mbox` | `.modal-box` |

### 1.4 Add Testing Infrastructure

- Install Vitest + React Testing Library.
- Add tests for: auth flow, custom data hooks, add-event flow, payment tracking.
- Add `npm test` script.

### 1.5 Error Boundary

- Add a top-level React error boundary with recovery UI.
- Per-tab error boundaries so one tab crashing doesn't kill the whole app.

### 1.6 Cleanup

- Add `.superpowers/` to `.gitignore`.
- Verify only `dist/` is deployed (not old `public/index.html` with inline Babel).

### Phase 1 Success Criteria

- Hub.jsx under 200 lines.
- Shared state in React Context with custom hooks.
- Vitest running with tests on auth, data hooks, and add-event flow.
- Error boundary with recovery UI.
- All CSS variables and class names semantic.
- `.superpowers/` in `.gitignore`.

---

## Phase 2 — Polish

**Goal:** Make it shine. UX consistency, finish half-done features.

### 2.1 Standardize Modals

All 12+ modals follow OcvModal pattern:
- Consistent header (title + close button).
- Consistent body (scrollable content area).
- Consistent footer (action buttons).
- Shared animation (modalIn / sheetUp).
- All forms use the same input/label/validation patterns.

### 2.2 Loading States

- Add loading states to every data fetch.
- Re-implement skeleton loaders (previously reverted) using the new per-tab architecture.
- Each tab shows its own loading state, not a global spinner.

### 2.3 Dark Mode Coverage

- Audit every component for inline styles that don't respect CSS variables.
- Replace hardcoded colors with variable references.
- Test dark mode on every screen and modal.

### 2.4 Finish Incomplete Features

- **Account deletion:** Build a real server-side edge function that removes user data within 30 days (GDPR compliance).
- **Skip-week undo:** Add UI to view and remove excluded_dates.
- **Admin dashboard RLS:** Proper row-level security gating so non-admin queries return nothing.
- **Carer role testing:** End-to-end test with a real carer login to verify permissions.

### 2.5 Typography Pass

- Ensure Fraunces (serif) is consistently used for all headings.
- Plus Jakarta Sans (sans-serif) for all body/UI text.
- Audit font sizes for hierarchy consistency.

### Phase 2 Success Criteria

- All modals follow OcvModal pattern with consistent structure.
- Loading states on every data fetch.
- Dark mode works everywhere with no inline style gaps.
- Account deletion removes data server-side.
- Skip-week has undo UI.
- Admin dashboard properly RLS-gated.
- Carer role tested end-to-end.

---

## Phase 3 — Scale

**Goal:** Prepare for the growth push.

### 3.1 Code Splitting & Lazy Loading

- Lazy-load ExploreTab and AdminDashboard (React.lazy + Suspense).
- Consider lazy-loading heavy modals (PasteScheduleModal at 565 lines).

### 3.2 Data Caching Layer

- Add a simple cache layer to custom hooks (stale-while-revalidate pattern).
- Clubs, schools, camps data cached with 5-minute TTL.
- User-specific data (events, payments) cached with 1-minute TTL, invalidated on mutation.
- Tab switches serve cached data instantly, refresh in background.

### 3.3 Error Monitoring

- Add Sentry (free tier) for production error capture.
- Configure source maps for meaningful stack traces.
- Set up alerts for error spikes.

### 3.4 Performance Audit

- Run Lighthouse and optimize for 90+ mobile score.
- Optimize images (og-image, icons).
- Review and optimize CSS (remove unused styles).
- Audit bundle size after code splitting.

### 3.5 Desktop Layout

- At 900px+, use the extra space meaningfully.
- Options: sidebar navigation, expanded calendar view, split-pane layouts.
- Design TBD — will brainstorm when we reach this phase.

### Phase 3 Success Criteria

- Explore tab and Admin dashboard lazy-loaded.
- Data caching prevents redundant API calls on tab switch.
- Sentry capturing errors in production.
- Lighthouse performance score 90+ on mobile.
- Desktop layout uses extra space at 900px+.

---

## Ongoing Process

After all phases complete:

- Every new feature goes through brainstorm -> plan -> build -> review cycle.
- Every new feature gets tests before shipping.
- Claude handles design decisions end-to-end; Dave reviews and approves.
- TDD for all new code.

---

## Out of Scope

- Full framework migration (staying with React + Vite).
- Backend rewrite (Supabase Edge Functions stay as-is unless specific issues arise).
- Native app store submissions (Capacitor builds exist but app store process is separate).
- Marketing site redesign (Landing.jsx improvements may come in Phase 2 but not the primary focus).
