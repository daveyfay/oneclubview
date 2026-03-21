# OneClubView — Claude Code Context

## What is this?
Family activity management app for Irish parents. Manages kids' extracurricular schedules, camps, clubs, fees, and school holidays. Single-page React app served from `public/index.html`.

## Architecture
- **Frontend**: Single HTML file with inline React/Babel (`public/index.html`)
- **Backend**: Supabase (Postgres + Auth + Edge Functions + RLS)
- **Hosting**: Netlify (auto-deploys from `main` branch)
- **Domain**: oneclubview.com

## Deploy Flow
Push to `main` → Netlify auto-builds → live at oneclubview.com
**Both Claude Code and Claude Chat deploy the same way: `git push origin main`**

## IDs and Config
- **Supabase project**: `uqihwazheypvmrcrqklg`
- **Netlify site**: `cff1b6b0-afee-466e-a23c-2db81abe6115`
- **Supabase URL**: `https://uqihwazheypvmrcrqklg.supabase.co`
- **GitHub**: `https://github.com/daveyfay/oneclubview.git`

## Credentials
All credentials are stored as Supabase Edge Function secrets and env vars.
- **GitHub PAT**: Ask Dave or check password manager
- **Anthropic key**: Set as `ANTHROPIC_API_KEY` in Supabase secrets (used in scrape-local)
- **Resend key**: Set as `RESEND_API_KEY` in Supabase secrets
- **Stripe webhook secret**: Set as `STRIPE_WEBHOOK_SECRET` in Supabase secrets
- **Supabase service role key**: Auto-available as `SUPABASE_SERVICE_ROLE_KEY` in edge functions

## Supabase Anon Key
The anon key is in `public/index.html` as the `SK` constant. It's public by design.

## Edge Functions (12 total)
| Function | JWT | Status | Purpose |
|---|---|---|---|
| scrape-local | false | v14 | AI-powered local data scraper (camps/clubs/things). Rate-limited 5/hr/IP. |
| auth-signup | false | v1 | Creates user with auto-confirmed email (bypasses broken SMTP) |
| send-invite | true | v6 | Sends family invite emails via Resend |
| parse-schedule | true | v4 | AI parses pasted club schedules |
| email-sequence | false | v3 | Queue-based welcome email sequence |
| inbound-email | false | v6 | Processes forwarded club emails |
| stripe-billing | true | v3 | Subscription management |
| stripe-webhook | false | v4 | Stripe event handler |
| scrape-camps | false | v3 | Camp provider scraper (AI-based, unreliable) |
| weekly-digest | false | v2 | DISABLED |
| sync-ical-feed | false | v2 | iCal feed sync |
| discover-nearby | false | v6 | Not used by frontend |

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

## Key Users
- Dave (dav3y.fay@gmail.com) — admin, account owner
- Liza (lizagrennan@gmail.com) — admin, family member
- OneClubView (hello@oneclubview.com) — admin, test account

## CURRENT PRIORITIES (as of Mar 21 2026)

### DONE (Mar 21 2026) — scrape-local geocoding
✅ `geocodeNewItems()` auto-geocodes clubs/camps/things after every scrape-local insert. Uses Nominatim with viewbox bias (works globally, not just Ireland). 111 existing bad-coord clubs fixed, ~25 "Multiple Dublin Locations" clubs nulled. Distance check removed — always updates from Nominatim.

### DONE (Mar 21 2026) — Calendar view
✅ Full month calendar with colored event dots for all days (recurring + manual). Day tap opens slide-up panel with event details. Month prev/next navigation. "Skip this week" adds to excluded_dates. Timeline hidden when in calendar mode.

### DONE (Mar 21 2026) — Family roles
✅ Signup checks family_invites and assigns correct role (admin/carer/viewer) + links family_id. InviteAdultModal has role picker. Mark paid / Add payment buttons defense-in-depth gated with isAdmin. Admin dashboard checks family_role (was checking wrong field).

### DONE (Mar 21 2026) — QA bug fixes
✅ Token refresh (sessions survive 1hr expiry). Driver field saved in AddEventModal. calcKm null checks. Trial banner no negative days. Camp booking duplicate guard. ThingsToDoSection extracted to top-level component. Dead code removed (STRIPE_PK, discoverSearch, fake rating). Account deletion emails admin with honest 30-day messaging.

### HIGH — Remaining items
- Account deletion needs real server-side data removal (currently just emails admin)
- Admin dashboard queries leak data — need proper RLS gating
- Need testing with real carer (grandparent) login
- "Skip this week" excluded_dates need UI to undo
- scrape-local edge function still has the coord bug at source (frontend geocoding compensates)

## COMPILE CHECK — Run before every deploy
```bash
python3 -c "
with open('public/index.html','r') as f: c=f.read()
s=c.find('<script type=\"text/babel\">')+len('<script type=\"text/babel\">')
e=c.rfind('</script>', 0, c.rfind('</script>'))
with open('/tmp/test.jsx','w') as f: f.write(c[s:e].strip())
"
npx @babel/core @babel/preset-react -e "const b=require('@babel/core'),f=require('fs');try{b.transformSync(f.readFileSync('/tmp/test.jsx','utf8'),{presets:['@babel/preset-react'],filename:'t.jsx'});console.log('Compiles OK')}catch(e){console.log('FAIL',e.message)}"
```

## RULES
1. NEVER deploy without compile check
2. NEVER deploy without tracing the actual user flow (not just checking strings exist)
3. Always git pull origin main before making changes (chat may have pushed)
4. Test with real data — verify DB queries return expected results
5. The file is big (200KB+) — make targeted edits not full rewrites
6. RLS is critical — never add USING(true) policies on sensitive tables
7. When editing public/index.html be very careful with str_replace — the file is dense
