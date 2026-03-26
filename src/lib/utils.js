// ── Analytics ──
export function track(event, params = {}) {
  try {
    if (typeof gtag === "function") gtag("event", event, params);
  } catch (e) { /* noop */ }
}

// ── Input sanitisation for PostgREST ──
export function san(v) {
  return v.replace(/[,().*=<>!&|;'"\\]/g, "").trim().slice(0, 100);
}

// ── Toast notification system ──
let _toastTimer = null;
export function showToast(msg, type = "ok") {
  let t = document.getElementById("ocv-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "ocv-toast";
    document.body.appendChild(t);
  }
  t.className = "toast toast-" + type;
  t.textContent = msg;
  clearTimeout(_toastTimer);
  requestAnimationFrame(() => {
    t.classList.add("show");
    _toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
  });
}

// ── Age calculation ──
export function getAge(d) {
  if (!d) return null;
  const t = new Date(), b = new Date(d);
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
}

// ── Week date helpers ──
export function weekDates() {
  const n = new Date(), d = n.getDay(), m = new Date(n);
  m.setDate(n.getDate() - ((d + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(m);
    x.setDate(m.getDate() + i);
    return x;
  });
}

export function isToday(d) {
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

// ── Distance helpers ──
export function calcKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 999;
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export function fmtDist(km) {
  return km < 1 ? (km * 1000).toFixed(0) + "m" : km < 10 ? km.toFixed(1) + "km" : Math.round(km) + "km";
}

// ── Date formatting ──
export function fmtDate(dateStr) {
  if (!dateStr) return "";
  // Handle both Date objects and date strings (e.g. "2026-03-27")
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

// ── Password strength ──
export function pwStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-5
}

// ── Geocoding helper ──
export async function geocodeNewItems(scrapeLat, scrapeLng, db) {
  const threshold = 0.005;
  const tables = [
    { name: "clubs", locationField: "location", select: "id,name,location,latitude,longitude" },
    { name: "camps", locationField: "location_name", select: "id,title,location_name,latitude,longitude" },
    { name: "things_to_do", locationField: "location_name", select: "id,title,location_name,latitude,longitude" }
  ];
  for (const table of tables) {
    const badCoords = await db(table.name, "GET", {
      select: table.select,
      filters: [
        "latitude=gte." + (scrapeLat - threshold),
        "latitude=lte." + (scrapeLat + threshold),
        "longitude=gte." + (scrapeLng - threshold),
        "longitude=lte." + (scrapeLng + threshold)
      ],
      limit: 100
    });
    const nullCoords = await db(table.name, "GET", {
      select: table.select,
      filters: ["latitude=is.null"],
      limit: 50
    });
    const seen = new Set();
    const rows = [...(badCoords || []), ...(nullCoords || [])].filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    if (rows.length === 0) continue;
    for (const row of rows) {
      const locText = row[table.locationField];
      if (!locText) continue;
      await new Promise(r => setTimeout(r, 1100));
      try {
        const bbox = (scrapeLng - 0.5) + "," + (scrapeLat - 0.5) + "," + (scrapeLng + 0.5) + "," + (scrapeLat + 0.5);
        const res = await fetch(
          "https://nominatim.openstreetmap.org/search?q=" +
          encodeURIComponent(locText) +
          "&format=json&limit=1&viewbox=" + bbox + "&bounded=0",
          { headers: { "User-Agent": "OneClubView/1.0" } }
        );
        const data = await res.json();
        if (data && data[0]) {
          const newLat = Number(data[0].lat);
          const newLng = Number(data[0].lon);
          await db(table.name, "PATCH", {
            filters: ["id=eq." + row.id],
            body: { latitude: newLat, longitude: newLng }
          });
        } else {
          // No geocode result — null out bad coords
          await db(table.name, "PATCH", {
            filters: ["id=eq." + row.id],
            body: { latitude: null, longitude: null }
          });
        }
      } catch (e) {
        console.error("Geocode error:", e);
      }
    }
  }
}
