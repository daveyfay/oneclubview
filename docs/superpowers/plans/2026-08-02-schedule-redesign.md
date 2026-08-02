# Schedule Tab + Event Detail Modal Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual richness to the Schedule tab — club-colored modal header with category icons, contextual holiday icons, segmented view control, and colored day pill dots.

**Architecture:** Pure frontend changes across 6 files. Extract `colourToGrad` to shared utils, thread `category` from Supabase through HubDataContext into event objects, then consume in EventDetailModal, WeekGrid, and ScheduleTab.

**Tech Stack:** React 19, Vite 8, Supabase JS v2, CSS-in-JS (inline styles following existing patterns)

**Spec:** `docs/superpowers/specs/2026-08-02-schedule-redesign-design.md`

---

## Chunk 1: Data Plumbing (extract utils, thread category)

### Task 1: Extract `colourToGrad` + `GRADS` to shared utils

**Files:**
- Modify: `src/lib/utils.js` (add exports at bottom)
- Modify: `src/components/hub/WeekGrid.jsx:1-32` (remove local definitions, add import)

- [ ] **Step 1: Add `colourToGrad` and `GRADS` to utils.js**

Append to the end of `src/lib/utils.js`:

```js
// ── Club colour gradients ──
const GRADS = [
  "linear-gradient(135deg,#3b82f6,#2563eb)",
  "linear-gradient(135deg,#22c55e,#16a34a)",
  "linear-gradient(135deg,#a855f7,#9333ea)",
  "linear-gradient(135deg,#ec4899,#db2777)",
  "linear-gradient(135deg,#14b8a6,#0d9488)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#6366f1,#4f46e5)",
  "linear-gradient(135deg,#ef4444,#dc2626)",
];

export function colourToGrad(hex) {
  if (!hex || hex === "#999") return "linear-gradient(135deg,#94a3b8,#64748b)";
  const h = hex.replace("#", "").toLowerCase();
  const map = {
    "2d7cb5": GRADS[0], "3b82f6": GRADS[0], "2563eb": GRADS[0],
    "2d5a3f": GRADS[1], "22c55e": GRADS[1], "16a34a": GRADS[1],
    "9b4dca": GRADS[2], "a855f7": GRADS[2], "9333ea": GRADS[2],
    "e84393": GRADS[3], "ec4899": GRADS[3], "db2777": GRADS[3],
    "1a8a7d": GRADS[4], "14b8a6": GRADS[4], "0d9488": GRADS[4],
    "c4960c": GRADS[5], "f59e0b": GRADS[5], "d97706": GRADS[5],
    "e67e22": GRADS[5],
    "6366f1": GRADS[6], "4f46e5": GRADS[6],
    "d64545": GRADS[7], "ef4444": GRADS[7], "dc2626": GRADS[7],
    "e85d4a": GRADS[7],
  };
  if (map[h]) return map[h];
  return `linear-gradient(135deg,${hex},${hex}dd)`;
}
```

- [ ] **Step 2: Update WeekGrid to import from utils**

In `src/components/hub/WeekGrid.jsx`:
- Remove lines 4-32 (the local `GRADS` array and `colourToGrad` function)
- Add import: `import { colourToGrad } from '../../lib/utils';` after the existing imports (line 2)

- [ ] **Step 3: Verify build passes**

Run: `cd C:/Users/dfay/oneclubview && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils.js src/components/hub/WeekGrid.jsx
git commit -m "refactor: extract colourToGrad to shared utils"
```

---

### Task 2: Thread `category` through HubDataContext

**Files:**
- Modify: `src/contexts/HubDataContext.jsx:34` (clubs query select)
- Modify: `src/contexts/HubDataContext.jsx:56` (clubs state mapping)
- Modify: `src/contexts/HubDataContext.jsx:170-172` (recurring weekEvts)
- Modify: `src/contexts/HubDataContext.jsx:185` (manual weekEvts)

- [ ] **Step 1: Add `category` to clubs join select**

In `src/contexts/HubDataContext.jsx` line 34, change:
```
clubs(id,name,address,location,phone,rating,term_start,term_end)
```
to:
```
clubs(id,name,address,location,phone,rating,term_start,term_end,category)
```

- [ ] **Step 2: Propagate `category` into clubs state**

In `src/contexts/HubDataContext.jsx` line 56, change:
```js
setClubs((c||[]).map(s=>({...s,club_id:s.club_id||s.clubs?.id,club_name:s.clubs?.name||"?",club_addr:s.clubs?.address,term_start:s.clubs?.term_start||null,term_end:s.clubs?.term_end||null})));
```
to:
```js
setClubs((c||[]).map(s=>({...s,club_id:s.club_id||s.clubs?.id,club_name:s.clubs?.name||"?",club_addr:s.clubs?.address,category:s.clubs?.category||null,term_start:s.clubs?.term_start||null,term_end:s.clubs?.term_end||null})));
```

- [ ] **Step 3: Add `category` to recurring event objects in weekEvts**

In `src/contexts/HubDataContext.jsx` line 172, in the `evts.push({...})` for recurring events, add `category: cl?.category || "other"` after `location: re.location || cl?.club_addr || null`.

The line currently ends with:
```
driver: re.driver || null, skipped: isSkipped, location: re.location || cl?.club_addr || null });
```
Change to:
```
driver: re.driver || null, skipped: isSkipped, location: re.location || cl?.club_addr || null, category: cl?.category || "other" });
```

- [ ] **Step 4: Add `category` to manual event objects in weekEvts**

In `src/contexts/HubDataContext.jsx` line 185, in the `evts.push({...})` for manual events, add `category: cl?.category || "other"` after `location: me.location || null`.

The line currently ends with:
```
attendees: mAtt, location: me.location || null });
```
Change to:
```
attendees: mAtt, location: me.location || null, category: cl?.category || "other" });
```

- [ ] **Step 5: Add `category` to calendar view event objects in ScheduleTab**

In `src/pages/tabs/ScheduleTab.jsx`, two `evts.push` blocks inside `monthEvtsMap` need `category`:

**Line 156 (recurring events)** — the line currently ends with:
```
driver: re.driver || null });
```
Change to:
```
driver: re.driver || null, category: cl?.category || "other" });
```

**Line 166 (manual events)** — the line currently ends with:
```
attendees: mAtt, location: me.location || null });
```
Change to:
```
attendees: mAtt, location: me.location || null, category: cl?.category || "other" });
```

- [ ] **Step 6: Verify build passes**

Run: `cd C:/Users/dfay/oneclubview && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 7: Commit**

```bash
git add src/contexts/HubDataContext.jsx src/pages/tabs/ScheduleTab.jsx
git commit -m "feat: thread club category through event objects"
```

---

## Chunk 2: WeekGrid Holiday Icons

### Task 3: Replace palm tree with contextual holiday icons

**Files:**
- Modify: `src/components/hub/WeekGrid.jsx:128-140` (holiday cell rendering)

- [ ] **Step 1: Add `getHolidayIcon` helper function**

In `src/components/hub/WeekGrid.jsx`, add this function before the component (after the imports):

```js
function getHolidayIcon(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("summer")) return "\u2600\uFE0F";
  if (n.includes("easter")) return "\uD83D\uDC23";
  if (n.includes("christmas")) return "\uD83C\uDF84";
  if (n.includes("mid-term") || n.includes("midterm")) return "\uD83C\uDFEB";
  if (n.includes("halloween")) return "\uD83C\uDF83";
  if (n.includes("bank holiday")) return "\uD83C\uDFD6\uFE0F";
  return "\uD83C\uDF34";
}
```

- [ ] **Step 2: Replace the hardcoded palm tree emoji**

In `src/components/hub/WeekGrid.jsx`, in the holiday cell (the block where `row === 0 && isHoliday(d) && dayEvts[col].length === 0`), change:
```jsx
<span style={{ fontSize: 16 }}>🌴</span>
```
to:
```jsx
<span style={{ fontSize: 16 }}>{getHolidayIcon(holName(d))}</span>
```

- [ ] **Step 3: Verify build passes**

Run: `cd C:/Users/dfay/oneclubview && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/hub/WeekGrid.jsx
git commit -m "feat: contextual holiday icons in WeekGrid"
```

---

## Chunk 3: Event Detail Modal Redesign

### Task 4: Redesign EventDetailModal with rich header band

**Files:**
- Modify: `src/components/modals/EventDetailModal.jsx:1-6` (imports)
- Modify: `src/components/modals/EventDetailModal.jsx:94-182` (regular event view)
- Modify: `src/pages/tabs/ScheduleTab.jsx:334` (pass new props)

- [ ] **Step 1: Update imports in EventDetailModal**

In `src/components/modals/EventDetailModal.jsx`, change the imports (lines 1-4) to:

```jsx
import { useState, useEffect } from 'react';
import ICN from '../../lib/icons';
import { COLS, CLUB_ICONS } from '../../lib/constants';
import OcvModal from './OcvModal';
import { db } from '../../lib/supabase';
import { showToast, colourToGrad } from '../../lib/utils';
```

- [ ] **Step 2: Update the component signature to accept new props**

In `src/components/modals/EventDetailModal.jsx` line 10, add `getMemberCol` to the destructured props:

Change:
```jsx
export default function EventDetailModal({event,open,onClose,onDelete,onDriverChange,onAttendeesChange,onMarkPaid,onColourChange,adults,familyAll,load}){
```
To:
```jsx
export default function EventDetailModal({event,open,onClose,onDelete,onDriverChange,onAttendeesChange,onMarkPaid,onColourChange,adults,familyAll,load,getMemberCol}){
```

- [ ] **Step 3: Replace the regular event view (lines 94-182)**

Replace everything from `// Regular event detail view` (line 94) to the closing `</OcvModal>;` and `}` at the end of the file with:

```jsx
  // Regular event detail view
  const icon = CLUB_ICONS[event.category] || CLUB_ICONS.other;
  const grad = colourToGrad(event.colour);
  const memberCol = getMemberCol ? getMemberCol(event.memberId, event.colour) : event.colour || "#999";
  const typeLabel = isRecurring ? "Recurring weekly" : isCamp ? "Camp booking" : "One-off event";
  const tintBg = (event.colour || "#999") + "14";

  return <OcvModal
    open={true}
    onClose={onClose}
    title=""
    width={400}
    footer={
      <div style={{display:"flex",gap:10}}>
        <button onClick={onClose} style={{flex:0,padding:"14px 20px",borderRadius:"var(--radius)",border:"1px solid var(--color-border)",background:"var(--color-card)",color:"var(--color-text)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",minHeight:48}}>Close</button>
        {event.skipped && isRecurring && (
          <button
            className="btn btn-primary"
            style={{flex:1}}
            onClick={async () => {
              const dateStr = event.date.toISOString().split("T")[0];
              const rec = await db("recurring_events", "GET", { filters: ["id=eq." + event.source_id] });
              if (rec && rec[0]) {
                const updated = (rec[0].excluded_dates || []).filter(d => d !== dateStr);
                await db("recurring_events", "PATCH", {
                  filters: ["id=eq." + event.source_id],
                  body: { excluded_dates: updated },
                });
                showToast("Week restored!");
                if (load) load();
                onClose();
              }
            }}
          >
            Restore this week
          </button>
        )}
        {isManual && !event.skipped && <button onClick={()=>{
          if(window.confirm("Remove this event? This can't be undone.")){
            onDelete(event);onClose();
          }
        }} style={{flex:0,padding:"14px 20px",borderRadius:"var(--radius)",border:"1px solid #fca5a5",background:"#fef2f2",color:"#ef4444",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",minHeight:48,whiteSpace:"nowrap"}}>Remove</button>}
        {isRecurring && !event.skipped && <button onClick={()=>{
          if(window.confirm("Skip this week?")){
            onDelete(event);onClose();
          }
        }} style={{flex:0,padding:"14px 20px",borderRadius:"var(--radius)",border:"none",background:"#f1f5f9",color:"#64748b",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",minHeight:48,whiteSpace:"nowrap"}}>Skip week</button>}
      </div>
    }
  >
    {/* Rich header band */}
    <div style={{background:event.skipped?"linear-gradient(135deg,#94a3b8,#64748b)":grad,padding:"20px 16px",color:"#fff",borderRadius:"12px 12px 0 0",margin:"-16px -16px 16px -16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{width:40,height:40,background:"rgba(255,255,255,.2)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{icon.emoji}</div>
        <div>
          <div style={{fontSize:16,fontWeight:700}}>{event.club||event.title||"Event"}</div>
          <div style={{fontSize:12,opacity:.8}}>{icon.label} &middot; {typeLabel}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:memberCol,border:"1.5px solid rgba(255,255,255,.5)"}}/>
        <span style={{fontSize:13,fontWeight:600}}>{event.member}</span>
      </div>
    </div>

    {/* Time + Location info cards */}
    <div style={{display:"flex",gap:12,marginBottom:16}}>
      <div style={{flex:1,background:tintBg,borderRadius:10,padding:10,textAlign:"center"}}>
        <div style={{fontSize:10,color:"var(--color-muted)",textTransform:"uppercase",marginBottom:2}}>Time</div>
        <div style={{fontSize:15,fontWeight:700,color:"var(--color-text)"}}>{event.time||"\u2014"}{event.endTime?"\u2013"+event.endTime:""}</div>
      </div>
      {event.location && <div style={{flex:1,background:tintBg,borderRadius:10,padding:10,textAlign:"center"}}>
        <div style={{fontSize:10,color:"var(--color-muted)",textTransform:"uppercase",marginBottom:2}}>Location</div>
        <div style={{fontSize:13,fontWeight:600,color:"var(--color-text)"}}>{event.location}</div>
      </div>}
    </div>

    {/* Colour row — only for one-off/manual events */}
    {isManual&&<><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:"1px solid var(--color-border)"}}>
      <span style={{fontSize:14,color:"var(--color-muted)"}}>Colour</span>
      <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>setShowColours(!showColours)}>
        <div style={{width:20,height:20,borderRadius:6,background:event.colour||"#999",border:"2px solid var(--color-border)"}}/>
        <span style={{fontSize:12,color:"var(--color-muted)"}}>{showColours?"\u25B2":"\u25BC"}</span>
      </div>
    </div>
    {showColours&&<div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"8px 0"}}>
      {COLOUR_OPTIONS.map(c=><div key={c} onClick={()=>{if(onColourChange)onColourChange(event,c);setShowColours(false)}} style={{width:28,height:28,borderRadius:8,background:c,cursor:"pointer",border:event.colour===c?"3px solid var(--color-primary)":"2px solid var(--color-border)",transition:"transform .1s"}} onTouchStart={ev=>ev.currentTarget.style.transform="scale(.85)"} onTouchEnd={ev=>ev.currentTarget.style.transform=""}/>)}
    </div>}</>}

    {/* Who's going — for manual events */}
    {isManual&&allFamily.length>0&&<div style={{marginBottom:20}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--color-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Who's going?</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {allFamily.map(name=><button key={name} onClick={()=>toggleGoing(name)}
          style={{padding:"8px 16px",borderRadius:12,border:going.includes(name)?"2px solid var(--color-primary)":"1.5px solid var(--color-border)",background:going.includes(name)?"var(--color-primary-bg)":"#fff",fontSize:13,fontWeight:going.includes(name)?700:500,color:going.includes(name)?"var(--color-primary)":"var(--color-text)",cursor:"pointer",fontFamily:"var(--font-sans)"}}>{name}</button>)}
        <button onClick={()=>{const next=[...allFamily];setGoing(next);if(onAttendeesChange)onAttendeesChange(event,next)}}
          style={{padding:"8px 16px",borderRadius:12,border:going.length===allFamily.length?"2px solid var(--color-primary)":"1.5px solid var(--color-border)",background:going.length===allFamily.length?"var(--color-primary-bg)":"#fff",fontSize:13,fontWeight:going.length===allFamily.length?700:500,color:going.length===allFamily.length?"var(--color-primary)":"var(--color-text)",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Everyone</button>
      </div>
    </div>}

    {/* Driver picker — adults only, uses club color for selected state */}
    {isRecurring&&driverOptions.length>0&&<div style={{marginBottom:20}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--color-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Who's driving?</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {driverOptions.map(a=><button key={a} onClick={()=>{if(onDriverChange)onDriverChange(event,a)}}
          style={{padding:"8px 16px",borderRadius:12,border:event.driver===a?`2px solid ${event.colour||"var(--color-primary)"}`:"1.5px solid var(--color-border)",background:event.driver===a?tintBg:"#fff",fontSize:13,fontWeight:event.driver===a?700:500,color:event.driver===a?(event.colour||"var(--color-primary)"):"var(--color-text)",cursor:"pointer",fontFamily:"var(--font-sans)",display:"flex",alignItems:"center",gap:6}}><span style={{display:"flex"}}>{ICN.car}</span> {a}{event.driver===a?" \u2713":""}</button>)}
      </div>
    </div>}
  </OcvModal>;
}
```

- [ ] **Step 4: Pass `getMemberCol` prop to EventDetailModal in ScheduleTab**

In `src/pages/tabs/ScheduleTab.jsx`, find the `<EventDetailModal` JSX (around line 334). Add `getMemberCol={getMemberCol}` as a new prop. Add it after `load={load}`:

Change:
```jsx
<EventDetailModal event={tapEvent} open={!!tapEvent} onClose={() => setTapEvent(null)} load={load}
```
To:
```jsx
<EventDetailModal event={tapEvent} open={!!tapEvent} onClose={() => setTapEvent(null)} load={load} getMemberCol={getMemberCol}
```

- [ ] **Step 5: Verify build passes**

Run: `cd C:/Users/dfay/oneclubview && npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/EventDetailModal.jsx src/pages/tabs/ScheduleTab.jsx
git commit -m "feat: redesign EventDetailModal with rich header band"
```

---

## Chunk 4: ScheduleTab Header Polish

### Task 5: Segmented view control

**Files:**
- Modify: `src/pages/tabs/ScheduleTab.jsx:54-56` (view toggle buttons)

- [ ] **Step 1: Replace view toggle buttons with segmented control**

In `src/pages/tabs/ScheduleTab.jsx`, find the view toggle div (line 54-56):

```jsx
          <div style={{ display: "flex", gap: 6 }}>
            {["grid", "list", "calendar"].map(v => <button key={v} onClick={() => { track("view_toggle", { view: v }); setWeekView(v); setSelectedDay(null) }} style={{ fontSize: 11, fontWeight: 600, color: weekView === v ? "var(--color-accent)" : "var(--color-muted)", background: weekView === v ? "var(--color-accent-bg)" : "none", border: weekView === v ? "1px solid var(--color-accent)" : "1px solid transparent", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontFamily: "var(--font-sans)", textTransform: "capitalize" }}>{v}</button>)}
          </div>
```

Replace with:

```jsx
          <div style={{ display: "flex", background: "var(--color-primary-bg)", borderRadius: 10, padding: 2, border: "1px solid var(--color-border)" }}>
            {["grid", "list", "calendar"].map(v => <button key={v} onClick={() => { track("view_toggle", { view: v }); setWeekView(v); setSelectedDay(null) }} style={{ fontSize: 11, fontWeight: 600, color: weekView === v ? "#fff" : "var(--color-muted)", background: weekView === v ? "var(--color-primary)" : "transparent", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontFamily: "var(--font-sans)", textTransform: "capitalize", transition: "background .2s, color .2s" }}>{v}</button>)}
          </div>
```

- [ ] **Step 2: Verify build passes**

Run: `cd C:/Users/dfay/oneclubview && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/tabs/ScheduleTab.jsx
git commit -m "feat: segmented control for schedule view toggle"
```

---

### Task 6: Colored event dots on day pills

**Files:**
- Modify: `src/pages/tabs/ScheduleTab.jsx:60-71` (day pills in list view)

- [ ] **Step 1: Replace activity bar with colored event dots**

In `src/pages/tabs/ScheduleTab.jsx`, find the day pills section (line 60-71). Inside the day pill mapping, find the activity bar indicator:

```jsx
              {dayEvts.length > 0 && <div style={{ width: 14, height: 3, borderRadius: 2, background: today ? "rgba(255,255,255,.35)" : "var(--color-accent)", marginTop: 1 }} />}
```

Replace with:

```jsx
              {dayEvts.length > 0 && <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 1 }}>
                {dayEvts.filter(e => !e.skipped).slice(0, 3).map((e, j) => <div key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: today ? "rgba(255,255,255,.6)" : getMemberCol(e.memberId, e.colour) }} />)}
              </div>}
```

- [ ] **Step 2: Verify build passes**

Run: `cd C:/Users/dfay/oneclubview && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/tabs/ScheduleTab.jsx
git commit -m "feat: colored event dots on schedule day pills"
```

---

## Chunk 5: Final Verification

### Task 7: Build + smoke test

- [ ] **Step 1: Full build**

Run: `cd C:/Users/dfay/oneclubview && npm run build`
Expected: Build succeeds with no errors or warnings about missing imports

- [ ] **Step 2: Run tests**

Run: `cd C:/Users/dfay/oneclubview && npm test`
Expected: All existing tests pass (15 tests across 3 files)

- [ ] **Step 3: Visual check list**

Start dev server (`npm run dev`) and verify:
1. Schedule tab grid view loads — event cards still show club color gradients
2. Holiday cells show contextual icons (summer/easter/etc) instead of all palm trees
3. View toggle is now a pill-shaped segmented control
4. Switching to list view — day pills show colored dots under dates
5. Tap any event card — modal opens with:
   - Club-colored gradient header
   - Category emoji in header
   - Kid name with color dot
   - Time + Location info cards
   - Driver picker uses club color for selected state
   - Skip/Remove buttons are muted (not alarming red)
6. Tap a payment event — payment modal unchanged
7. Dark mode: header gradient still looks good, info cards readable
