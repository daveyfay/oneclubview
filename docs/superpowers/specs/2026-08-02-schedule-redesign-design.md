# Schedule Tab + Event Detail Modal Redesign

## Summary

Visual polish pass on three components: EventDetailModal, WeekGrid holiday cells, and ScheduleTab header. The goal is to bring club identity (color, category icon) and kid identity (color dots) into the schedule experience, replacing the current bare key-value layout in the modal and generic palm tree emojis on holidays.

## 1. Event Detail Modal — Rich Header Band

### Current state
- Plain `OcvModal` with title "Luca — Soccer Training"
- Key-value rows for Time, Club, Location inside bordered container
- Driver picker with bordered pill buttons using hardcoded `--color-primary`
- Footer: "Done" (primary blue) + "Skip this week" (alarming red border)
- No club color, no category icon, no kid color dot

### New design

**Header section** (replaces the plain title):
- Background: club color gradient using existing `colourToGrad()` from WeekGrid
- Large category emoji from `CLUB_ICONS` (matched via club's `category` field)
- Club name as hero text (16px, bold, white)
- Subtitle line: category label + event type ("Recurring weekly" / "One-off event" / "Camp booking")
- Kid's name with their COLS color dot (8px circle, color from `getMemberCol()`)
- If event is skipped: desaturated grey gradient, muted text

**Body section**:
- Time + Location displayed as two side-by-side soft-colored info cards
  - Background tinted to club color at ~8% opacity
  - Each card: small uppercase label on top, value below in bold
  - If no location, Time card spans full width
- Driver picker (recurring events): same pill layout, but selected state uses club color instead of `--color-primary`
- Who's going (manual events): no changes needed, current design works
- Colour picker (manual events): no changes needed
- Camp/recurring labels: remove italic text, the header subtitle already communicates this

**Footer**:
- "Close" button: neutral grey background (`var(--color-card)` with border), left side
- "Skip week" (recurring) or "Remove" (manual): muted styling
  - Recurring skip: grey background `#f1f5f9`, grey text `#64748b` — NOT red
  - Manual remove: light red background `#fef2f2`, muted red text `#ef4444`, thin border
- "Restore this week" (skipped events): keep current behavior, style as primary action

**Data threading**:
- Event objects need `category` field to look up CLUB_ICONS
- **HubDataContext query change** (line 34): The `hub_subscriptions` select does NOT currently fetch `category`. Add it: `clubs(id,name,address,location,phone,rating,term_start,term_end,category)`. Propagate on line 56: add `category: s.clubs?.category || null`
- In `weekEvts` (HubDataContext lines 170-172, 185): add `category: cl?.category || "other"` to each event push
- In ScheduleTab's calendar `monthEvtsMap`: add `category: cl?.category || "other"` to each event push
- Import `CLUB_ICONS` in EventDetailModal. Fallback: `const icon = CLUB_ICONS[event.category] || CLUB_ICONS.other`

**Shared utility extraction**:
- `colourToGrad()` and `GRADS` (WeekGrid lines 4-32) are local, not exported. Extract into `src/lib/utils.js` and import from both WeekGrid and EventDetailModal.

**getMemberCol prop**:
- EventDetailModal does not use `useHubData()`. Pass `getMemberCol` as a new prop from ScheduleTab.

**No changes to**:
- Payment detail view (lines 35-92) — already well-designed
- OcvModal wrapper itself

## 2. WeekGrid — Contextual Holiday Icons

### Current state
- Holiday cells show palm tree emoji and first word of holiday name
- All holidays look identical regardless of type

### New design

Holiday icon mapping based on keyword match on holiday name:
| Keyword | Icon |
|---------|------|
| summer | sun |
| easter | chick |
| christmas | tree |
| mid-term / midterm | school |
| halloween | pumpkin |
| bank holiday | beach |
| default | palm tree (current) |

Implementation: simple function `getHolidayIcon(name)` that does case-insensitive `includes()` checks. Inline in WeekGrid, no need for constants.js export.

**No changes to**:
- Event cards (color gradients already work well)
- Legend, swipe handling, page indicators

## 3. ScheduleTab Header — Segmented Control + Day Pill Dots

### Segmented control (replaces text toggle buttons)

- Container: pill-shaped with `var(--color-primary-bg)` background, `1px solid var(--color-border)`, `border-radius: 10px`, `padding: 2px`
- Three equal segments: Grid, List, Calendar
- Active segment: `var(--color-primary)` background, white text, `border-radius: 8px`
- Inactive segments: transparent background, `var(--color-muted)` text
- Smooth transition: `background 0.2s, color 0.2s`

### Day pills with colored event dots (list view)

Current: single thin activity bar (width 14px, height 3px) below date number.

New: 1-3 small colored dots (4px diameter circles) below the date number:
- Each dot represents one event on that day
- Dot color: `getMemberCol(event.memberId, event.colour)` — same as calendar view
- Cap at 3 dots to avoid overflow
- If today: dots are `rgba(255,255,255,.6)` (matches calendar view pattern)
- Replaces the single bar indicator

## 4. Files Changed

| File | Change scope |
|------|-------------|
| `src/components/modals/EventDetailModal.jsx` | Major rework of regular event view (lines 94-182). Payment view untouched. |
| `src/components/hub/WeekGrid.jsx` | Holiday icon function (~10 lines). Replace emoji on line 137. |
| `src/pages/tabs/ScheduleTab.jsx` | Segmented control (~15 lines replacing line 55). Day pill dots (~10 lines replacing line 68). |
| `src/contexts/HubDataContext.jsx` | Add `category` to clubs query select + propagate into clubs state + weekEvts event objects |
| `src/lib/utils.js` | Extract `colourToGrad()` + `GRADS` from WeekGrid |
| `src/lib/constants.js` | No changes needed — CLUB_ICONS already exists |

### Data threading for category field

- HubDataContext line 34: add `category` to clubs join select
- HubDataContext line 56: propagate `category: s.clubs?.category || null` into clubs state
- HubDataContext weekEvts (lines 170-172, 185): add `category: cl?.category || "other"` to event objects
- ScheduleTab monthEvtsMap (lines 156, 166): add `category: cl?.category || "other"` to event objects
- Extract `colourToGrad()` + `GRADS` from WeekGrid into `src/lib/utils.js`
- Pass `getMemberCol` as new prop to EventDetailModal from ScheduleTab

## 5. Not Changing

- Payment detail modal view
- Calendar month view (already has colored dots)
- List view event cards (already well-designed)
- Forward email banner
- WeekGrid event cards (gradients are good)
- OcvModal component itself
- Any backend/database changes
- Dark mode support (CSS vars handle this automatically)
