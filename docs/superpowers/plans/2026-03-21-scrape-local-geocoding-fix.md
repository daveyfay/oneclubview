# Fix scrape-local Geocoding — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After scrape-local inserts clubs/camps/things with wrong coordinates (user's GPS), automatically geocode them using Nominatim so Near Me, Discover, and Camps all show correct distances.

**Architecture:** Add a `geocodeNewItems()` function to `public/index.html` that runs after every scrape-local call. It queries all three tables for items whose coordinates suspiciously match the scrape input coordinates (within ~0.005°), then batch-geocodes each via Nominatim using the item's `location`/`location_name` text field, updating the DB with correct lat/lng. Rate-limited to 1 req/sec per Nominatim policy.

**Tech Stack:** Frontend JS (inline in index.html), Nominatim API (free, no key needed), Supabase REST API (existing `db()` helper)

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `public/index.html:171-177` | Context | Existing `calcKm()` and `fmtDist()` helpers |
| `public/index.html:~177` | **Insert** | New `geocodeNewItems(scrapeLat, scrapeLng)` function |
| `public/index.html:802` | **Modify** | Wire geocoding into GPS scrape-local callback |
| `public/index.html:819` | **Modify** | Wire geocoding into family-location scrape-local callback |

---

## Chunk 1: Geocoding Post-Processor

### Task 1: Add the geocodeNewItems function

This function takes the coordinates that were sent to scrape-local, finds items in all three tables that have those exact coordinates (the bug), and fixes them via Nominatim.

**Files:**
- Modify: `public/index.html:177` (insert after `fmtDist`)

- [ ] **Step 1: Add geocodeNewItems function after fmtDist (line 177)**

Insert this code after the `fmtDist` function:

```javascript
async function geocodeNewItems(scrapeLat, scrapeLng) {
  // Find items whose coords suspiciously match the scrape input (within ~500m)
  // These are the ones where AI just echoed back user GPS instead of real location
  const threshold = 0.005; // ~500m
  const tables = [
    { name: "clubs", locationField: "location", select: "id,name,location,latitude,longitude" },
    { name: "camps", locationField: "location_name", select: "id,title,location_name,latitude,longitude" },
    { name: "things_to_do", locationField: "location_name", select: "id,title,location_name,latitude,longitude" }
  ];

  for (const table of tables) {
    const rows = await db(table.name, "GET", {
      select: table.select,
      filters: [
        "latitude=gte." + (scrapeLat - threshold),
        "latitude=lte." + (scrapeLat + threshold),
        "longitude=gte." + (scrapeLng - threshold),
        "longitude=lte." + (scrapeLng + threshold)
      ],
      limit: 100
    });
    if (!rows || rows.length === 0) continue;

    for (const row of rows) {
      const locText = row[table.locationField];
      if (!locText) continue;

      // Rate limit: 1 request per second (Nominatim policy)
      await new Promise(r => setTimeout(r, 1100));

      try {
        const res = await fetch(
          "https://nominatim.openstreetmap.org/search?q=" +
          encodeURIComponent(locText + ", Ireland") +
          "&format=json&limit=1",
          { headers: { "User-Agent": "OneClubView/1.0" } }
        );
        const data = await res.json();
        if (data && data[0]) {
          const newLat = Number(data[0].lat);
          const newLng = Number(data[0].lon);
          // Only update if Nominatim returned a meaningfully different location
          if (calcKm(scrapeLat, scrapeLng, newLat, newLng) > 0.5) {
            await db(table.name, "PATCH", {
              filters: ["id=eq." + row.id],
              body: { latitude: newLat, longitude: newLng }
            });
            console.log("Geocoded:", table.name, row.name || row.title, "→", newLat, newLng);
          }
        }
      } catch (e) {
        console.warn("Geocode failed for", row.name || row.title, e);
      }
    }
  }
}
```

- [ ] **Step 2: Wire geocodeNewItems into GPS scrape-local callback (line 802)**

Change the scrape-local `.then()` at line 802 from:

```javascript
.then(d=>{if(d.status==="success"&&(d.camps_inserted>0||d.clubs_inserted>0||d.things_inserted>0))load()})
```

To:

```javascript
.then(async d=>{if(d.status==="success"&&(d.camps_inserted>0||d.clubs_inserted>0||d.things_inserted>0)){await geocodeNewItems(loc.lat,loc.lng);load()}})
```

- [ ] **Step 3: Wire geocodeNewItems into family-location scrape-local callback (line 819)**

Change the scrape-local `.then()` at line 819 from:

```javascript
.then(d=>{if(d.status==="success"&&(d.camps_inserted>0||d.clubs_inserted>0||d.things_inserted>0))load()})
```

To:

```javascript
.then(async d=>{if(d.status==="success"&&(d.camps_inserted>0||d.clubs_inserted>0||d.things_inserted>0)){await geocodeNewItems(Number(fl.latitude),Number(fl.longitude));load()}})
```

- [ ] **Step 4: Run compile check**

```bash
python3 -c "
with open('public/index.html','r') as f: c=f.read()
s=c.find('<script type=\"text/babel\">')+len('<script type=\"text/babel\">')
e=c.rfind('</script>', 0, c.rfind('</script>'))
with open('/tmp/test.jsx','w') as f: f.write(c[s:e].strip())
"
npx @babel/core @babel/preset-react -e "const b=require('@babel/core'),f=require('fs');try{b.transformSync(f.readFileSync('/tmp/test.jsx','utf8'),{presets:['@babel/preset-react'],filename:'t.jsx'});console.log('Compiles OK')}catch(e){console.log('FAIL',e.message)}"
```

Expected: `Compiles OK`

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "fix: auto-geocode clubs/camps/things after scrape-local inserts

scrape-local AI returns user GPS coords for every item instead of actual
club locations. New geocodeNewItems() post-processor queries for items
with suspicious coords matching scrape input, then geocodes each via
Nominatim using location text field. Runs automatically after every
scrape that inserts new data. Rate-limited 1req/sec per Nominatim policy."
```

---

## Chunk 2: Fix existing bad data (Supabase SQL — manual step for Dave)

### Task 2: One-time geocode fix for existing items with bad coordinates

Some items in the DB may still have wrong coordinates from previous scrapes. Dave runs this SQL in the Supabase dashboard to identify them.

**Where:** Supabase Dashboard → SQL Editor (https://supabase.com/dashboard/project/uqihwazheypvmrcrqklg/sql/new)

- [ ] **Step 1: Identify clusters of items at identical coordinates**

Run this SQL to find groups of 3+ clubs at the exact same location (a telltale sign of the GPS bug):

```sql
SELECT latitude, longitude, count(*) as cnt,
  array_agg(name) as club_names
FROM clubs
WHERE latitude IS NOT NULL
GROUP BY latitude, longitude
HAVING count(*) >= 3
ORDER BY cnt DESC;
```

If this returns clusters, those need geocoding. The frontend fix will handle new items going forward, but existing clusters can be fixed with the geocoding function by triggering a scrape near those coordinates (it will detect them within the threshold and re-geocode).

- [ ] **Step 2: Verify things_to_do and camps too**

```sql
SELECT latitude, longitude, count(*) as cnt,
  array_agg(title) as titles
FROM things_to_do
WHERE latitude IS NOT NULL
GROUP BY latitude, longitude
HAVING count(*) >= 3
ORDER BY cnt DESC;

SELECT latitude, longitude, count(*) as cnt,
  array_agg(title) as titles
FROM camps
WHERE latitude IS NOT NULL
GROUP BY latitude, longitude
HAVING count(*) >= 3
ORDER BY cnt DESC;
```

---

## Chunk 3: Push & deploy

### Task 3: Deploy

- [ ] **Step 1: git push origin main**

Netlify auto-deploys from main. Live at oneclubview.com within ~30 seconds.

- [ ] **Step 2: Test by logging in and checking console**

Log in at oneclubview.com, open browser DevTools console. If you're in a new area, you should see `Geocoded: clubs ClubName → lat lng` messages as items get corrected.

---

## How it works end-to-end

1. User opens app → GPS captured → `scrape-local` called with GPS coords
2. `scrape-local` AI finds local clubs/camps/things, inserts them (with wrong coords — the existing bug)
3. **NEW**: `geocodeNewItems(lat, lng)` runs immediately after
4. Queries clubs/camps/things_to_do for items within 500m of the scrape coordinates
5. For each match, calls Nominatim with the item's location text + ", Ireland"
6. If Nominatim returns coordinates >500m from the scrape point, updates the item
7. `load()` refreshes all data with correct coordinates
8. Near Me, Discover, and Camps tabs all show correct distances
