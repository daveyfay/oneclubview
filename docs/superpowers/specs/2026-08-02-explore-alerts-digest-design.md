# Explore + Alerts + Weekly Digest — Design Spec

## Goal
Redesign the Explore tab for desktop/mobile, build a unified alert system for due dates and deadlines, and create a weekly email digest with weather-aware weekend suggestions.

## Context
OneClubView is a family activity management app for Irish parents. The Explore tab surfaces clubs, camps, and things to do. The alert system notifies parents of upcoming fees, camp deadlines, and schedule gaps. The weekly digest emails the full week's schedule with suggestions for unscheduled weekend slots.

## Decisions Made
- **Data strategy:** Hybrid — AI scrapes to seed, manual curation to verify
- **Email audience:** Both parents (admin + carer), same email
- **Weekend suggestions:** Age-matched + weather-aware + distance-filtered
- **Alert cadence:** 7 days, 3 days, overdue (moderate)
- **Alert channels:** In-app only (email covers push)
- **Alert style:** Subtle — thin colored left border, muted background
- **Explore layout:** Tab pills (mobile) / left sidebar with location picker (desktop)
- **Email timing:** Sunday evening
- **Email design:** Hybrid — branded header, mostly text, simple table schedule

---

## System 1: Explore Tab Redesign

### Mobile Layout (< 900px)
- Tab pills at top: "My Clubs" | "Camps" | "Discover"
- Same tab switching pattern as current
- Alert callout banner above content when relevant (per section)
- Cards use existing design system (border-radius: 16px, shadows, CSS vars)

### Desktop Layout (>= 900px)
- Left sidebar (240px fixed width):
  - Section nav links: My Clubs, Camps, Discover (highlight active)
  - Divider
  - Location picker: dropdown or pill list of family locations (Home, School, Work)
  - Active location shown with distance radius
- Main content area (flex: 1):
  - Selected section content fills the remaining width
  - Cards in 2-column grid where appropriate (camps, things to do)
  - My Clubs can stay single-column (list with details)

### Alert Callouts (per section)
- Thin left border (4px), muted background, icon + text + optional action link
- Colors: info (#e8f0f5 bg, #2d7cb5 border), warn (#fffbeb bg, #c4960c border), urgent (#fef2f2 bg, #dc2626 border)
- Examples:
  - Camps tab: "Easter camps filling fast — 3 suit Penny's age" → action: scroll to Easter section
  - Clubs tab: "Swimming fee due in 5 days — EUR 180" → action: navigate to Money tab
  - Discover tab: "Nothing planned Saturday — here are ideas near home" → action: scroll to suggestions

### Data Quality Indicators
- Scraped items show normally (no badge)
- Curated/verified items show a subtle checkmark badge
- Implementation: add `verified` boolean column to clubs, camps, things_to_do tables (default false)

### Location Picker Scope
The sidebar location picker filters **Camps** and **Discover** sections (distance-based content). **My Clubs** always shows all subscribed clubs regardless of distance (they're the user's clubs, not discovery).

### Files to Create/Modify
- Create: `src/components/explore/ExploreSidebar.jsx` — desktop sidebar with nav + location picker
- Modify: `src/pages/tabs/ExploreTab.jsx` — restructure layout, add sidebar on desktop, add alert callouts
- Modify: `src/lib/global.css` — add `.explore-layout`, `.explore-sidebar`, `.alert-callout` styles with responsive breakpoints
- Note: Alert callouts use the shared `src/components/AlertCallout.jsx` from System 2 (not a separate component)

---

## System 2: Alert System Enhancement

### Alert Types and Triggers

| Alert | Trigger | Severity | Location | Visibility |
|-------|---------|----------|----------|------------|
| Fee due (7 days) | `payment_reminders.due_date` within 7 days, not paid | info | OverviewTab, Money tab | admin only |
| Fee due (3 days) | `payment_reminders.due_date` within 3 days, not paid | warn | OverviewTab, Money tab | admin only |
| Fee overdue | `payment_reminders.due_date` in past, not paid | urgent | OverviewTab, Money tab | admin only |
| Camp closing soon | Suitable camp `start_date` within 14 days, not booked | info | OverviewTab, Explore/Camps | all roles |
| Holiday uncovered | School holiday within 21 days, no camp booked for kid | warn | OverviewTab, Explore/Camps | all roles |
| Weekend gap | Saturday or Sunday with no events for any kid | info | OverviewTab, Explore/Discover | all roles |
| Clash today | Two events overlap in time today | urgent | OverviewTab, Schedule tab | all roles |
| No driver | Today's event has no driver assigned | info | OverviewTab, Schedule tab | all roles |
| No end time | Events this week with no end time set | info | OverviewTab | all roles |
| Camp recommendation | Carer recommended a camp (status=recommended) | info | OverviewTab | admin only |

### Alert Rendering
- Subtle left-border callout style (consistent with Explore tab callouts)
- Max 5 alerts shown in OverviewTab (expandable "Show all" if more)
- Contextual alerts shown at top of relevant tab (max 2 per tab)
- Each alert has: icon, text, optional action button, dismiss capability
- Dismissed alerts stored in localStorage (`ocv-dismissed-alerts`) with TTL

### Alert Computation
- Computed in `HubDataContext` as a memoized `alerts` array
- Each alert: `{ id, type, severity, text, action, tab, dismissible, adminOnly }`
- Consumed by OverviewTab (aggregated) and individual tabs (filtered by `tab` field)
- Weekend gap alerts require checking `weekEvts` for Saturday/Sunday entries
- **Refactoring note:** The existing inline alert logic in OverviewTab (lines ~45-135) must be extracted and moved into this new `alerts` computation in HubDataContext. The old inline code should be removed and replaced with consumption of the `alerts` array from context. This includes the existing "no end time" and "camp recommendation" alert types which are preserved in the alert table above.
- The existing standalone clash detection card in OverviewTab (lines ~137-157) should be **removed** — clash information will be shown via AlertCallout only, avoiding duplication.

### Files to Create/Modify
- Create: `src/components/AlertCallout.jsx` — shared alert callout component (used by both Explore and other tabs)
- Modify: `src/contexts/HubDataContext.jsx` — add `alerts` computed array to context value
- Modify: `src/pages/tabs/OverviewTab.jsx` — use new AlertCallout component, show up to 5
- Modify: `src/pages/tabs/MoneyTab.jsx` — show fee alerts at top
- Modify: `src/pages/tabs/ScheduleTab.jsx` — show clash/driver alerts at top

---

## System 3: Weekly Email Digest

### Architecture
```
Supabase pg_cron (Sunday 18:00 UTC)
  → invoke Edge Function: weekly-digest
    → for each active user with email:
      → fetch week's events (Mon-Sun)
      → fetch unpaid fees due in 7 days
      → fetch camps for uncovered holidays
      → fetch weather forecast (Open-Meteo API)
      → fetch weekend suggestions (things_to_do, filtered by age + distance + weather)
      → render HTML email
      → send via Resend API
```

### Email Content Structure

```
┌─────────────────────────────────────┐
│ [Logo] OneClubView                  │
│ Your week ahead — 4–10 Aug 2026     │
├─────────────────────────────────────┤
│                                     │
│ SCHEDULE                            │
│ ┌───────────────────────────────┐   │
│ │ Mon 4   Swimming (Penny) 16:00│   │
│ │         GAA (Cooper) 16:30    │   │
│ │ Tue 5   Piano (Penny) 17:00   │   │
│ │ Wed 6   —                     │   │
│ │ Thu 7   Gymnastics 15:30      │   │
│ │ Fri 8   —                     │   │
│ │ Sat 9   ☀️ Nothing planned    │   │
│ │ Sun 10  —                     │   │
│ └───────────────────────────────┘   │
│                                     │
│ FEES DUE                            │
│ ⚠ Swimming Term 3 — EUR 180        │
│   Due: Wed 6 Aug (3 days)           │
│                                     │
│ WEEKEND IDEAS (Saturday)            │
│ ☀️ Sunny, 18°C forecast             │
│ • Bull Island Nature Walk (3km)     │
│   Ages 4-12 · Free · Outdoor       │
│ • Malahide Castle Playground (5km)  │
│   Ages 3-10 · Free · Outdoor       │
│ • Imaginosity (8km)                 │
│   Ages 2-9 · EUR 12 · Indoor       │
│                                     │
│ CAMP ALERT                          │
│ 🏕 Easter Break in 3 weeks         │
│ Penny has no camp booked.           │
│ 3 camps suit her age near home.     │
│ [Browse camps →]                    │
│                                     │
├─────────────────────────────────────┤
│ [Open OneClubView]                  │
│ Unsubscribe · Privacy              │
└─────────────────────────────────────┘
```

### Weather Integration
- **API:** Open-Meteo (https://api.open-meteo.com/v1/forecast)
- **Parameters:** `latitude`, `longitude`, `daily=weathercode,temperature_2m_max`
- **No API key needed** — free and open
- **Logic:**
  - Fetch 7-day forecast for user's primary location (first family_location or profile lat/lng)
  - Weather codes 0-3: sunny/partly cloudy → bias outdoor suggestions
  - Weather codes 51-99: rain/storm → bias indoor suggestions
  - Show weather icon + temp in email for Sat/Sun
- **Fallback:** If API fails, show suggestions without weather bias

### Weekend Suggestion Algorithm
Note: The edge function runs server-side and cannot access the React client's `weekEvts`. It must query `recurring_events` and `manual_events` tables directly to build the week's schedule.

1. Find Saturday and Sunday slots with no events (query DB directly)
2. For each open day:
   - Query `things_to_do` within radius of user's primary location
   - Filter by kids' age range (youngest to oldest)
   - If weather is rainy: prioritize `category` in (indoor, cultural, farm)
   - If weather is dry: prioritize `category` in (outdoor, nature, adventure, beach, playground)
   - Sort by distance ascending
   - Return top 3 suggestions
3. If no `things_to_do` data available, omit section (don't show empty)

### Edge Function: `weekly-digest`
- **JWT:** false (invoked by cron, not user)
- **Trigger:** pg_cron schedule: `0 18 * * 0` (Sunday 18:00 UTC = 19:00 IST summer / 18:00 GMT winter — both acceptable "Sunday evening" times)
- **Process:**
  1. Fetch all profiles where `subscription_status` in ('active', 'trial') and `email` is not null
  2. For family groups: send one email per user (both parents get their own copy)
  3. For each user, gather: week events, fees, camps, weather, suggestions
  4. Render HTML email from template
  5. Send via Resend API (batch, rate-limited)
  6. Log send status to `email_queue` table (existing table — add `type='digest'` to distinguish from welcome sequence emails)
- **Unsubscribe:** Add `digest_opt_out` boolean to `profiles` table (default false). Check before sending. Unsubscribe link in email sets this flag via a simple edge function.

### Files to Create/Modify
- Create: `supabase/functions/weekly-digest/index.ts` — rewrite of disabled function
- Create: `supabase/functions/weekly-digest/email-template.ts` — HTML email template builder
- Create: `supabase/functions/digest-unsubscribe/index.ts` — unsubscribe handler
- Modify: `profiles` table — add `digest_opt_out` boolean column (migration)
- Modify: `src/pages/tabs/SettingsTab.jsx` — add digest opt-out toggle

---

## Database Changes

### New Columns
- `profiles.digest_opt_out` — boolean, default false
- `clubs.verified` — boolean, default false
- `camps.verified` — boolean, default false
- `things_to_do.verified` — boolean, default false

### Existing Schema Assumptions
The `things_to_do` table is confirmed to have: `category` (text), `latitude` (numeric), `longitude` (numeric), `age_min` (int), `age_max` (int), `cost_eur` (numeric), `description` (text), `website_url` (text), `seasonal` (boolean), `event_date` (date). These are used by the weekend suggestion algorithm.

The `email_queue` table exists with at minimum: `id`, `user_id`, `type`, `status`, `created_at`. No schema changes needed.

### Migration SQL
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS digest_opt_out boolean DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE things_to_do ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
```

---

## Dependencies

- **Open-Meteo API** — free, no key, no rate limit concerns for weekly batch
- **Resend API** — already integrated for invites/sequences
- **pg_cron** — Supabase built-in, needs enabling in dashboard if not already

## Out of Scope
- Push notifications (Capacitor) — future enhancement
- User-configurable alert preferences — future enhancement
- Weather-aware in-app suggestions (only in email for now)
- Scraping improvements (separate project)
- Email open/click tracking

## Success Criteria
1. Explore tab renders correctly on mobile (< 900px) and desktop (>= 900px)
2. Desktop sidebar shows section nav + location picker
3. Alert callouts appear at top of relevant tabs when conditions are met
4. Weekly email sends Sunday evening to all active/trial users
5. Email includes schedule, fees due, weekend suggestions, camp alerts
6. Weekend suggestions are age-appropriate and weather-biased
7. Users can unsubscribe from digest in Settings
