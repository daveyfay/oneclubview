# OneClubView — Claude Code Context

## Before You Start
- Read `LESSONS.md` before working on edge functions, landing page, or service workers.
- Query `information_schema.columns` for every DB table before writing edge function code.

## What is this?
Family activity management app for Irish parents. Manages kids' extracurricular schedules, camps, clubs, fees, and school holidays.

## Architecture
- **Frontend**: React 19 + Vite 8 SPA with component-based structure in `src/`
- **Entry point**: `index.html` (root) loads `src/main.jsx`
- **Backend**: Supabase (Postgres + Auth + Edge Functions + RLS)
- **Hosting**: Netlify (auto-deploys from `main` branch)
- **Mobile**: Capacitor 8 (iOS + Android shells scaffolded)
- **Monitoring**: Sentry (via `VITE_SENTRY_DSN` env var)
- **Domain**: oneclubview.com

## Key Source Structure
```
src/
  main.jsx            — Entry point (Sentry init, Capacitor setup, PWA)
  App.jsx             — Screen router (landing/auth/onboard/hub/admin)
  pages/
    Landing.jsx       — Marketing landing page
    Auth.jsx          — Login/signup
    OnboardKids.jsx   — Onboarding step 1
    OnboardClubs.jsx  — Onboarding step 2
    Hub.jsx           — Main app shell with tab bar + FAB
    AdminDashboard.jsx — Site admin (hello@oneclubview.com only)
    tabs/             — Overview, Schedule, Money, Explore, Settings
  components/
    modals/           — 15 modals (OcvModal wrapper pattern)
    hub/              — WeekGrid, CampCard, NearbyClubs, ThingsToDo, DiscoverResults
    ErrorBoundary.jsx, Logo.jsx, SchoolPicker.jsx, CancelFeedback.jsx
  contexts/
    HubDataContext.jsx — Shared data layer (kids, clubs, pays, members)
  hooks/
    useHubData.js     — Hook to consume HubDataContext
  lib/
    supabase.js       — Auth + DB helpers (au, db, SB, SK, tokens)
    utils.js          — track(), showToast(), calcKm(), getAge(), etc.
    constants.js      — COLS (colors), category lists
    cache.js          — 5-min TTL cache for camps/categories
    icons.jsx         — SVG icon components
    global.css        — Design system (CSS vars, dark mode, animations)
public/
  index.html          — OLD monolithic app (3700+ lines, legacy, NOT the live app)
  blog/               — Blog pages
  sw.js, robots.txt, sitemap.xml, llms.txt
```

## Deploy Flow
Push to `main` -> Netlify runs `vite build` -> publishes `dist/` -> live at oneclubview.com

## Build & Test
```bash
npm run build     # Vite production build
npm test          # Vitest (15 tests across 3 files)
npm run dev       # Local dev server on port 3000
```

## IDs and Config
- **Supabase project**: `uqihwazheypvmrcrqklg`
- **Netlify site**: `cff1b6b0-afee-466e-a23c-2db81abe6115`
- **Supabase URL**: `https://uqihwazheypvmrcrqklg.supabase.co`
- **GitHub**: `https://github.com/daveyfay/oneclubview.git`

## Credentials
All credentials are stored as Supabase Edge Function secrets and env vars.
- **Anthropic key**: `ANTHROPIC_API_KEY` in Supabase secrets (used in scrape-local)
- **Resend key**: `RESEND_KEY` in Supabase secrets (NOT RESEND_API_KEY)
- **Stripe webhook secret**: `STRIPE_WEBHOOK_SECRET` in Supabase secrets
- **Supabase service role key**: Auto-available as `SUPABASE_SERVICE_ROLE_KEY` in edge functions
- **Supabase anon key**: In `src/lib/supabase.js` as `SK` constant (public by design)

## Edge Functions (12 total)
| Function | JWT | Purpose |
|---|---|---|
| scrape-local | false | AI-powered local data scraper. Rate-limited 5/hr/IP. |
| auth-signup | false | Creates user with auto-confirmed email |
| send-invite | true | Sends family invite emails via Resend |
| parse-schedule | true | AI parses pasted club schedules |
| email-sequence | false | Queue-based welcome email sequence |
| inbound-email | false | Processes forwarded club emails |
| stripe-billing | true | Subscription management |
| stripe-webhook | false | Stripe event handler |
| scrape-camps | false | Camp provider scraper (AI-based, unreliable) |
| weekly-digest | false | DISABLED |
| sync-ical-feed | false | iCal feed sync |
| discover-nearby | false | Not used by frontend |
| delete-account | false | GDPR account deletion |

## Database Key Tables
- `profiles` — users, with `family_role` (admin/carer/viewer), `family_id` for sharing
- `dependants` — children, linked to `parent_user_id`
- `clubs` — 230+ clubs with lat/lng coordinates
- `camps` — 76 camps (Easter + Summer)
- `things_to_do` — family attractions/activities
- `schools` — 128 primary schools with coordinates
- `family_locations` — Home/School/Work locations per user for proximity filtering
- `hub_subscriptions` — user club memberships
- `recurring_events` — weekly schedule entries
- `manual_events` — one-off events
- `payment_reminders` — fee tracking
- `camp_bookings` — camp interest/booking status
- `family_invites` — invite adults to family with role
- `rate_limits` — rate limiting for edge functions
- `email_queue` — scheduled emails

## Security
- ALL tables have RLS enabled
- Sensitive data scoped to `auth.uid()` or family via `get_my_family_user_ids()`
- No secrets in frontend code (only Supabase anon key which is public)
- Rate limiting on scrape-local (5 calls/IP/hour)
- Admin dashboard hardcoded to hello@oneclubview.com only

## Pricing (as of Aug 2026)
- Standard: EUR 4.99/mo (2 adults, 3 kids)
- Family+: EUR 7.99/mo (4 adults, 6 kids)
- 14-day free trial
NOTE: The structured data in index.html still shows old pricing (7.99/14.99) — needs fixing.

## Key Users
- Dave (dav3y.fay@gmail.com) — admin, account owner
- Liza (lizagrennan@gmail.com) — admin, family member
- OneClubView (hello@oneclubview.com) — admin, test account + site admin

## God Nodes (most connected code)
1. `db()` (56 edges) — Supabase query helper, used everywhere
2. `showToast()` (33 edges) — Toast notifications
3. `track()` (19 edges) — Analytics tracking
4. `OcvModal()` (15 edges) — Modal wrapper component
5. `useHubData()` (15 edges) — Shared data hook

## ADMIN DASHBOARD WARNING
NEVER conflate `family_role` (admin/carer/viewer = parent role within a family) with site admin.
The admin dashboard is gated to `hello@oneclubview.com` specifically. Do NOT change this gating
without explicit approval from Dave.

## RULES
1. NEVER deploy without running `npm run build` successfully
2. NEVER deploy without tracing the actual user flow
3. Always `git pull origin main` before making changes
4. Test with real data — verify DB queries return expected results
5. RLS is critical — never add USING(true) policies on sensitive tables
6. Make targeted edits, not full rewrites
7. The old `public/index.html` is legacy — the live app is in `src/`

## graphify
This project has a knowledge graph at graphify-out/.
- For codebase questions, run `graphify query "<question>"` when graphify-out/graph.json exists
- Use `graphify path "<A>" "<B>"` for relationships
- Use `graphify explain "<concept>"` for focused concepts
- After modifying code, run `graphify update .` to keep the graph current
