import React, { useState } from 'react';
import { isToday, colourToGrad } from '../../lib/utils';

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

export default function WeekGrid({ weekDays, events, holidays, onTapEvent, kids }) {
  // Split 7 days into pages of 4 (page 0 = days 0-3, page 1 = days 3-6)
  // Use overlapping pages so swipe feels natural
  const [page, setPage] = useState(() => {
    // Auto-detect: if today is in second half of week, show page 1
    const todayIdx = weekDays.findIndex(d => isToday(d));
    return todayIdx >= 4 ? 1 : 0;
  });

  const pageDays = page === 0 ? weekDays.slice(0, 4) : weekDays.slice(3, 7);

  const dayEvts = pageDays.map(d =>
    events.filter(e =>
      e.date.getFullYear() === d.getFullYear() &&
      e.date.getMonth() === d.getMonth() &&
      e.date.getDate() === d.getDate() &&
      !e.skipped
    )
  );

  const maxEvts = Math.max(1, ...dayEvts.map(de => de.length));

  // Build club legend from ALL week events (not just current page)
  const legendMap = new Map();
  weekDays.forEach(d => {
    events.filter(e =>
      e.date.getFullYear() === d.getFullYear() &&
      e.date.getMonth() === d.getMonth() &&
      e.date.getDate() === d.getDate() &&
      !e.skipped
    ).forEach(e => {
      const key = e.club || e.title || "";
      if (key && !legendMap.has(key)) legendMap.set(key, e.colour || "#999");
    });
  });

  const isHoliday = (d) =>
    (holidays || []).some(h => {
      const s = new Date(h.start_date), e2 = new Date(h.end_date);
      return d >= s && d <= e2;
    });

  const holName = (d) => {
    const h = (holidays || []).find(h2 => d >= new Date(h2.start_date) && d <= new Date(h2.end_date));
    return h ? h.name : "";
  };

  // Swipe handling
  const [touchStart, setTouchStart] = useState(null);
  function onTouchStartHandler(e) { setTouchStart(e.touches[0].clientX); }
  function onTouchEndHandler(e) {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (diff > 50 && page === 0) setPage(1);
    else if (diff < -50 && page === 1) setPage(0);
    setTouchStart(null);
  }

  return (
    <div style={{ marginBottom: 14 }} onTouchStart={onTouchStartHandler} onTouchEnd={onTouchEndHandler}>
      {/* Day labels row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginBottom: 6 }}>
        {pageDays.map((d, i) => {
          const today = isToday(d);
          const hol = isHoliday(d);
          return (
            <div key={i} style={{
              textAlign: "center", padding: "8px 4px", borderRadius: 12,
              background: today ? "var(--color-primary)" : hol ? "#fef3e2" : "transparent"
            }}>
              <span style={{
                display: "block", fontSize: 10, fontWeight: 700,
                color: today ? "rgba(255,255,255,.6)" : "var(--color-muted)",
                textTransform: "uppercase"
              }}>
                {d.toLocaleDateString("en-IE", { weekday: "short" }).slice(0, 3)}
              </span>
              <span style={{
                display: "block", fontSize: 18, fontWeight: 800,
                color: today ? "#fff" : hol ? "#b8860b" : "var(--color-text)"
              }}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Activity grid rows */}
      {Array.from({ length: maxEvts }).map((_, row) => (
        <div key={row} style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginBottom: 4 }}>
          {pageDays.map((d, col) => {
            const e = dayEvts[col][row];
            if (!e) {
              if (row === 0 && isHoliday(d) && dayEvts[col].length === 0) {
                return (
                  <div key={col} style={{
                    borderRadius: 10, padding: "8px 4px", textAlign: "center",
                    background: "#fef3e2", border: "1px solid #fde68a",
                    minHeight: 56, display: "flex", flexDirection: "column",
                    justifyContent: "center", alignItems: "center"
                  }}>
                    <span style={{ fontSize: 16 }}>{getHolidayIcon(holName(d))}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, color: "#b8860b", marginTop: 2 }}>
                      {holName(d).split(" ")[0]}
                    </span>
                  </div>
                );
              }
              return <div key={col} style={{ minHeight: 56 }} />;
            }
            return (
              <div
                key={col}
                onClick={() => onTapEvent && onTapEvent(e)}
                onTouchStart={ev => { ev.currentTarget.style.transform = "scale(.93)"; }}
                onTouchEnd={ev => { ev.currentTarget.style.transform = ""; }}
                style={{
                  borderRadius: 10, padding: "8px 5px", textAlign: "center",
                  background: colourToGrad(e.colour), color: "#fff",
                  minHeight: 56, display: "flex", flexDirection: "column",
                  justifyContent: "center", alignItems: "center",
                  cursor: "pointer", transition: "transform .1s",
                  overflow: "hidden", position: "relative",
                  boxShadow: "0 2px 6px rgba(0,0,0,.12)"
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", display: "block" }}>
                  {e.club || e.title || ""}
                </span>
                <span style={{ fontSize: 9, fontWeight: 500, opacity: .85, marginTop: 2 }}>
                  {e.member}
                </span>
                {e.time && (
                  <span style={{ fontSize: 8, fontWeight: 600, opacity: .7, marginTop: 1 }}>
                    {e.time}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Swipe indicator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0 4px" }}>
        <svg onClick={() => page === 1 && setPage(0)} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={page === 0 ? "var(--color-border)" : "var(--color-muted)"} strokeWidth="2" strokeLinecap="round" style={{ cursor: page === 1 ? "pointer" : "default" }}><polyline points="15 18 9 12 15 6" /></svg>
        <span style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500 }}>
          {page === 0 ? "Mon–Thu" : "Wed–Sun"}
        </span>
        <svg onClick={() => page === 0 && setPage(1)} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={page === 1 ? "var(--color-border)" : "var(--color-muted)"} strokeWidth="2" strokeLinecap="round" style={{ cursor: page === 0 ? "pointer" : "default" }}><polyline points="9 18 15 12 9 6" /></svg>
        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          <div style={{ width: page === 0 ? 14 : 6, height: 6, borderRadius: 3, background: page === 0 ? "var(--color-primary)" : "var(--color-border)", transition: "width .2s", cursor: "pointer" }} onClick={() => setPage(0)} />
          <div style={{ width: page === 1 ? 14 : 6, height: 6, borderRadius: 3, background: page === 1 ? "var(--color-primary)" : "var(--color-border)", transition: "width .2s", cursor: "pointer" }} onClick={() => setPage(1)} />
        </div>
      </div>

      {/* Club colour legend */}
      {legendMap.size > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "8px 2px 0", marginTop: 4 }}>
          {Array.from(legendMap.entries()).map(([name, colour]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--color-muted)", fontWeight: 600 }}>
              <div style={{ width: 8, height: 8, borderRadius: 3, background: colour, flexShrink: 0 }} />
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
