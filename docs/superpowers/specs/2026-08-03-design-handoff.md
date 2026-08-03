# Handoff: OneClubView app redesign

## Overview
A full redesign of the OneClubView app (`oneclubview.com/#/app`) — the family organiser for kids' clubs, activities, camps and fees. The existing app is a Vite + React + Supabase SPA (`daveyfay/oneclubview`) whose Hub screen is a dense stack of small cards; the redesign restructures the same data around three questions a parent actually asks: **what's next, who's driving, what's owed.**

Five screens, mobile and desktop: Today, Week, Explore, Money, Family.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing intended look and behaviour, not production code to copy directly. The task is to **recreate these designs inside the existing codebase** (`daveyfay/oneclubview`: React 18 + Vite, plain CSS variables in `src/lib/global.css`, Supabase for data, Capacitor for the native shell) using its established patterns.

Concretely, that means:
- Update the CSS custom properties in `src/lib/global.css` to the token table below.
- Rebuild `src/pages/tabs/OverviewTab.jsx` as the new **Today** screen, `ScheduleTab.jsx` / `WeekGrid.jsx` as **Week**, `ExploreTab.jsx` (+ `NearbyClubsSection.jsx`, `ThingsToDoSection.jsx`) as **Explore**, `MoneyTab.jsx` as **Money**.
- Keep the existing data layer (`HubDataContext`, `useHubData`, `db()` from `src/lib/supabase.js`). All content in the prototype is dummy data standing in for those queries.
- Do **not** port the prototype's inline-style approach wholesale — it exists because the prototype is a single streaming HTML file. In the app, keep using CSS variables and the existing class conventions.

## Fidelity
**High-fidelity.** Colours, typography, spacing, radii and interactions are final. Recreate pixel-accurately using the codebase's existing component conventions.

Two things are deliberately unspecified: real iconography (the prototype uses coloured initial tiles and plain text where the current app uses emoji — see *Open decisions*) and empty/loading states beyond those noted.

---

## Design Tokens

Replace the values in `:root` in `src/lib/global.css`.

| Token | Value | Use |
| --- | --- | --- |
| `--color-primary` | `#1a2a3a` | Dark navy. Headings, primary buttons, active nav, "Up next" card background |
| `--color-primary-light` | `#2d4a5f` | Medium navy. Progress fill, secondary emphasis |
| `--color-primary-bg` | `#e8f0f5` | Ice blue tint. Chips, active filter background, progress track |
| `--color-accent` | `#e85d4a` | Burnt coral. Driver avatar, "needs a driver" CTA, overdue figure |
| `--color-accent-bg` | `#fff0ee` | Light coral tint. Clash callout, overdue chip |
| `--color-warm` | `#f8f6f3` | Warm off-white. App background |
| `--color-card` | `#ffffff` | Card and rail surfaces |
| `--color-text` | `#1a1a1a` | Body text |
| `--color-muted` | `#7c8590` | Cool gray. Labels, secondary text |
| `--color-border` | `#e4e2de` | Warm gray hairline |

Supporting greys used in the prototype (derive from `--color-muted` if you prefer a smaller set):

`#5a6470` body-secondary · `#6b7480` meta text · `#98a0a9` empty-state text · `#a8afb7` inactive tab · `#bcc2c8` inactive day number · `#cbd1d6` chevrons

On-navy text: `#f4f7fa` primary, `#c3d3e0` body, `#8fa8bd` labels. Dividers on navy: `rgba(244,247,250,.18)`.

Coral text on tint: `#c14a37`. Danger red: `#E63946` on `#FEF0F0`.

Surfaces: segmented-control track `#ece9e4`, neutral chip `#f1efec`.

### Member colours
Per-child identity colours (used for dots, bars, avatars). Drawn from the existing `COLS` array in `src/lib/constants.js`, chosen to stay distinguishable from the navy chrome:

`#2d7cb5` blue · `#e85d4a` coral · `#9B5DE5` purple

Explore category tiles additionally use: `#0ea5e9`, `#22c55e`, `#92400e`, `#65a30d`, `#dc2626`, `#6366f1`, `#9B5DE5`, `#1a2a3a`.

### Typography
| Role | Family | Notes |
| --- | --- | --- |
| Display / serif | **Fraunces** (500, 600, 700) | Screen titles, numerals, card headlines. Always `letter-spacing:-.01em` to `-.02em` at large sizes, `line-height:1.02–1.1` |
| Body / sans | **Plus Jakarta Sans** (400–800) | All UI text |
| Label / mono | **DM Mono** (400, 500) | Small uppercase eyebrows only: `font-size:10.5–11px; letter-spacing:.16em; text-transform:uppercase; color:var(--color-muted)` |

Type scale in use — mobile: 38px screen title (Fraunces), 32px "Up next" name, 17px list item, 15px body, 13.5px meta, 12px chip, 11px eyebrow. Desktop: 44px screen title, 27px "Up next", 19px list item, 16px body, 14.5px meta.

Minimum interactive height is **44px** everywhere (`min-height:44px` on buttons; chips 38–42px are tap-adjacent, not primary targets).

### Radii, shadow, motion
- Radii: 26px hero cards · 20px rails/callouts · 18px list cards · 14px small cards & segmented track · 12px buttons · 11px small buttons · 8–9px chips · 46px phone bezel · 16px desktop window
- Card shadow: `0 2px 8px rgba(26,42,58,.05)`
- Navy button shadow: `0 4px 12px rgba(26,42,58,.20)`
- Bottom bar: `0 8px 24px rgba(26,42,58,.10)` + `backdrop-filter: saturate(180%) blur(20px)` over `rgba(255,255,255,.93)`
- Sheet: `0 -12px 40px rgba(26,42,58,.18)`
- Keyframes: `ocvFade` (opacity, .25s ease) for tab changes · `ocvRise` (10px up + fade, .4s ease) for the Up next card · `ocvSheet` (translateY 102%→0, .3s `cubic-bezier(.16,1,.3,1)`) for the bottom sheet
- Respect `prefers-reduced-motion` (the existing global.css rule already does this)

---

## Screens / Views

### Shared chrome

**Mobile** — 390 × 844. Content scrolls under a floating bottom tab bar: `position:absolute; left/right:14px; bottom:12px; padding:9px 6px; border-radius:22px; border:1px solid var(--color-border);` frosted white. Five tabs (Today, Week, Explore, Money, Family), each a column of an 18×3px rounded mark above an 11px/700 label. Active: mark and label both `--color-primary`. Inactive: label `#a8afb7`, mark transparent. Tab padding `6px 9px`, `min-height:44px`. Content padding `6px 22px 124px`.

**Desktop** — 1280px wide, three panes, min-height 760px:
- **Nav rail** 248px, white, `border-right:1px solid var(--color-border)`, padding `24px 16px`, gap 26px. Contains: logo lockup (28px mark + "OneClubView" in Fraunces 18px/700), the five nav items, a "Showing" kid-filter list, and pinned to the bottom an "Add an activity" navy button plus the current user row. Nav item: full-width button, `padding:11px 14px; border-radius:12px; font-size:14.5px/600`, 6px dot on the left (accent when active, `#cbd1d6` otherwise); active state is navy fill + white text.
- **Main pane** flex:1, padding `34px 36px 44px`. Eyebrow (DM Mono) → 44px Fraunces title → 16px summary line → content.
- **Context rail** 326px, white, `border-left:1px solid var(--color-border)`, padding `34px 24px`, gap 16px. Persists across tabs: Up next card, outstanding strip, "Needs a driver", term progress.

Both breakpoints share one state object — changing the kid filter or tab in either place updates the other.

---

### 1. Today
**Purpose:** answer "what's happening in the next few hours, and am I the one driving?"

Layout (mobile, top to bottom):
1. Eyebrow `Mon 3 August`; 38px Fraunces title `Today`; 15px summary — *"{n} activities, {n} runs on you."*
2. **Kid filter chips** — horizontal wrap, 7px gap. Pill: `padding:8px 15px; min-height:38px; border-radius:100px; font-size:13.5px/600`. Inactive: white, `1.5px solid var(--color-border)`, `#5a6470` text, 7px member-colour dot. Active: navy fill, white text and dot. First chip is "Everyone" with no dot.
3. **Up next card** — navy `#1a2a3a`, `border-radius:26px; padding:24px 22px 20px`, animates in with `ocvRise`. Row of two DM Mono labels (`UP NEXT` / countdown, both `#8fa8bd`); 32px Fraunces activity name; 13.5px meta line *"Ava · 16:30–17:15 · Aura Leisure, Trim"* in `#c3d3e0`; hairline divider; footer row with a 26px coral rounded-square avatar (driver initial), *"You're driving"* / *"Sarah is driving"* in 14px/600, and travel time right-aligned in `#8fa8bd`.
4. **"Rest of the day" timeline** — eyebrow, then rows of: 46px right-aligned DM Mono time column · 1px vertical rule with a 9px member-colour dot (2px background-coloured ring) at the row top · content column with 17px/600 name, 13.5px `#6b7480` meta *"Kid · Venue"*, and a driver chip (`display:inline-block; margin-top:8px; padding:4px 9px; border-radius:8px; font-size:12px/600`). Assigned: `--color-primary-bg` / navy text. Unassigned: `--color-accent-bg` / `#c14a37`, copy *"No driver yet — tap to claim"*. Rows are tappable and open the activity sheet.
5. **Outstanding strip** — full-width, `border-radius:20px; padding:17px 19px`, flex with a right chevron. Coral tint + coral border when anything is overdue, otherwise ice-blue tint + navy. Copy: *"€185 outstanding"* / *"1 payment overdue · 3 total"*. Navigates to Money.

Desktop Today replaces the timeline with a wider table-like list: 64px DM Mono time column, 19px name, 14.5px meta, driver chip right-aligned and `flex-shrink:0; white-space:nowrap; align-self:center` (this matters — the mobile chip style collapses in a horizontal row). Rows separated by 1px borders, 18px vertical padding.

---

### 2. Week
**Purpose:** see the shape of the week and spot clashes.

Mobile: eyebrow `3 – 9 August`, title `This week`, summary *"8 activities across 5 days · 1 clash to sort."*, kid chips, then one row per day (14px gap): a 44px left column with DM Mono day-of-week and a 23px Fraunces date (navy for today, `#bcc2c8` otherwise), and a right column of event cards. Event card: white, 1px border, `border-radius:14px; padding:11px 13px`, a 3px vertical member-colour bar, 15px/600 name, 12.5px meta *"Finn · Sarah"* or *"Finn · no driver"*, and a DM Mono time right-aligned in navy.

**Clash callout** — when a day has multiple activities and one has no driver: coral-tint row, `1px solid #f9c9c1`, 12px radius, 6px coral dot, 12.5px/600 `#c14a37` text — *"Two runs at once — nobody assigned to Soccer"*. This replaces the current app's silent overlap.

Empty day: 14px `#a8afb7` — *"Nothing on — a free evening."*

Desktop: a real 7-column grid (10px gap) rather than the current paged Mon–Thu / Wed–Sun swipe. Each column has a bordered header (day-of-week + date) and stacked cards; card shows a 22×3px horizontal colour bar, 13.5px/700 name, DM Mono time, 11.5px meta. Empty day shows just "Free".

---

### 3. Explore
**Purpose:** find a club to join, or somewhere to go this weekend.

A segmented control switches two modes — **Clubs near you** and **Things to do** — replacing the current tab-within-tab. Segmented control: `#ece9e4` track, 4px padding, 14px radius; active segment white with `0 2px 6px rgba(26,42,58,.10)`, navy 13.5px/700 text; inactive `#7c8590`.

Below it: a one-line context string (*"Clubs within 10 km of Dunboyne"* / *"Sorted by distance from home"*), then a horizontally scrolling row of category pills (first is `All · {count}`), same pill spec as the kid chips.

Card (mobile, white, 18px radius, 16–17px padding):
- Header row: 42px rounded-square (13px radius) in the category colour with the name's initial in Fraunces 17px/700 white; name 16.5px/600; place 13px `#7c8590`.
- 13.5px description, `line-height:1.5`.
- Chip row (6px gap, wraps): **distance** (ice-blue/navy) · **category** for clubs, or **price** for things to do — `Free` in ice-blue/navy, a price in coral tint/`#c14a37` · **age range** for clubs, or *"Suits Ava, Finn"* for things to do (neutral `#f1efec`/`#6b7480`). Reserve the coral chip for money only.
- Full-width action button: outline navy → on tap becomes a filled `--color-primary-bg` button reading **"On the list"**. Label is "Add club" or "Add to schedule" by mode.

Desktop: same cards in a 2-up grid (12px gap, 20px padding), segmented control and category pills on one row, button left-aligned rather than full width.

Real data comes from the existing `clubs` and `things_to_do` Supabase tables — see `NearbyClubsSection.jsx` (distance via `calcKm`, radius filter, category counts) and `ThingsToDoSection.jsx` (age-suitability filter, `cost_eur`, `event_date`, `addedIds` persisted to `localStorage` under `ocv_added_things`). Keep all of that; only the presentation changes.

---

### 4. Money
**Purpose:** one number, then the list behind it.

1. Eyebrow `Fees & payments`, 38px title `Money`.
2. **Balance card** — white, 26px radius, 24px/22px padding. DM Mono `OUTSTANDING` label; the total in **46px Fraunces** (coral when anything is overdue, navy otherwise); 14px sub-line *"1 overdue · rest due this month"*; hairline; then a term row — *"Autumn term"* left, *"€195 paid of €380"* right — over a 7px progress bar (`--color-primary-bg` track, `#2d4a5f` fill, `width` transitions .4s).
3. **Segmented control** — `Due · 3` / `Paid · 2`.
4. **Fee cards** — white, 18px radius, 16–17px padding. Title 16px/600; member dot + name 13px; amount right-aligned in **26px Fraunces** (red `#E63946` overdue, `#2d4a5f` paid, `--color-text` otherwise). Footer row: a due chip (`Due Fri 8 Aug` neutral · `Overdue since 1 Aug` red-on-`#FEF0F0` · `Paid 12 Jul` ice-blue) and a navy **"Mark paid"** button. Marking paid moves the card to the Paid segment, updates the total, the progress bar and the Today strip.

Desktop: same balance card in the context rail; fee cards in a 2-up grid at 20px padding.

---

### 5. Family
**Purpose:** who's in the household, and who can see what.

Member rows — white card, 18px radius, 15–17px padding, 40px rounded-square avatar (13px radius) in the member colour with the initial, 16px/600 name, 13px meta *"8 · 3rd Class · Swimming, Piano"*, chevron.

Below, a **Sharing** card on `--color-primary-bg` with a 1px border and 20px radius: 16px/600 *"Both parents see everything"*, 13.5px explanation, and an outlined navy **"Invite another adult"** button (44px min height).

Desktop: member rows in a 2-up grid.

---

## Interactions & Behavior

| Trigger | Behaviour |
| --- | --- |
| Tab / nav item | Switches screen, closes any open sheet. Content fades in (`ocvFade` .25s). |
| Kid filter chip | Filters today's list, the week grid, fees and the context rail simultaneously. "Everyone" clears it. |
| Tap an activity (Today row, Week card, or "Needs a driver" item) | Opens the detail bottom sheet. |
| Bottom sheet | Backdrop `rgba(16,22,30,.44)` + 3px blur, fades in .18s. Sheet slides up (`ocvSheet`), white, `border-radius:28px 28px 46px 46px` (bottom radius matches the bezel), 14px/24px/34px padding, 38×4px grab handle. Content: member dot + name eyebrow, 29px Fraunces activity name, then label/value rows (78px DM Mono label column, 15px/500 value) for **When, Where, Driving, Bring, Coach**. Two buttons: navy **"I'm driving"** and grey **"Skip this week"**. Both close the sheet — wire them to a driver-assignment mutation and the existing skip/`recs` logic. Tapping the backdrop closes. |
| "Mark paid" | Optimistically flips the fee to paid; recalculates outstanding, counts, progress and the Today strip. In the app this is the existing `db("payment_reminders","PATCH",{paid:true})` call plus a toast. |
| Due/Paid and Clubs/Things segments | Local view state only. Switching Explore mode resets the category filter to "All". |
| Explore "Add" | Flips the button to "On the list". For things to do, real behaviour follows `ThingsToDoSection.jsx`: an item with an `event_date` posts straight to `manual_events`; otherwise open the existing `DateTimePicker` first. |

**Responsive:** the prototype shows two fixed frames rather than a fluid page. In the app, the mobile layout applies below 1024px and the three-pane desktop layout at 1024px and up (matching the existing breakpoint in `global.css`). The context rail is the piece to drop first on narrow desktop — fold Up next and the outstanding strip back into the main column.

## State Management

Prototype state (all local; map each to real data):

| Key | Type | Meaning | Real source |
| --- | --- | --- | --- |
| `tab` | `'today' \| 'week' \| 'explore' \| 'money' \| 'family'` | Active screen | Router / existing Hub tab state |
| `kid` | `'all' \| dependantId` | Member filter | Existing `filter` prop threaded through the tabs |
| `seg` | `'due' \| 'paid'` | Money segment | Local |
| `exSub` | `'clubs' \| 'things'` | Explore mode | Local (currently a sub-tab in `ExploreTab.jsx`) |
| `exCat` | category id or `'all'` | Explore category filter | Local |
| `sheet` | event id or `null` | Open activity sheet | Local; content from `weekEvts` |
| `paid` | `{ [feeId]: true }` | Optimistic paid flags | `payment_reminders.paid` |
| `added` | `{ [itemId]: true }` | Explore added flags | `localStorage: ocv_added_things` + `manual_events` |

Derived values the prototype computes and the app will need equivalents for: the next upcoming event and its countdown, per-day event buckets, unassigned-driver list (drives both the clash callout and the desktop rail), outstanding / paid totals, overdue count, and term progress percentage. `HubDataContext` already assembles `weekEvts`, `pays`, `clubs`, `kids` and `alerts` — these are all cheap derivations on top.

**Loading:** keep the existing shimmer skeletons (`.skeleton-shimmer`), re-shaped to the new cards — one large balance card, one Up next block, three list rows.

## Assets
None external. The logo is inline SVG (three concentric circles: navy `#1a2a3a` disc, 7px white ring at r=30, coral `#e85d4a` centre at r=10) — an adaptation of `src/components/Logo.jsx`, which currently uses a white centre. Fonts load from Google Fonts: Fraunces, Plus Jakarta Sans, DM Mono.

The prototype deliberately uses **no emoji** and no icon set, unlike the current app (`CLUB_ICONS`, `TTD_ICONS`, `CT` in `src/lib/constants.js`). Category identity is carried by colour + initial instead.

## Open decisions
1. **Emoji vs. icons.** If you want to keep the existing emoji taxonomy, it slots into the 42px Explore tile and the member dots — but re-test the calmness of the Today screen before doing it globally.
2. **Camps.** The current app has camps and camp bookings (`CampCard.jsx`, `campBookings`). They aren't given a home in this redesign; the natural fit is a third Explore mode or a seasonal band on Week.
3. **Admin vs. member roles.** The current app hides money and add-actions behind `isAdmin`. The prototype shows the admin view throughout.

## Files
- `OneClubView Redesign.dc.html` — the full prototype: both breakpoints, all five screens, all interactions. Open it directly in a browser.
- `support.js` — the small runtime the prototype file needs to render. Not part of the deliverable; it exists only so the HTML opens standalone.

Source files in `daveyfay/oneclubview@main` this was built from: `src/lib/global.css`, `src/lib/constants.js`, `src/lib/icons.jsx`, `src/components/Logo.jsx`, `src/pages/tabs/OverviewTab.jsx`, `src/pages/tabs/MoneyTab.jsx`, `src/components/hub/WeekGrid.jsx`, `src/components/hub/NearbyClubsSection.jsx`, `src/components/hub/ThingsToDoSection.jsx`.
