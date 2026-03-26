import React, { useState } from 'react';
import OcvModal from './OcvModal';

export default function DateTimePicker({ open, onClose, onSelect, title }) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selDate, setSelDate] = useState(null);
  const [selTime, setSelTime] = useState("10:00");
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const monthName = new Date(year, month).toLocaleDateString("en-IE", { month: "long", year: "numeric" });

  function nextDay(dayOfWeek) {
    const d = new Date();
    d.setDate(d.getDate() + ((dayOfWeek - d.getDay() + 7) % 7 || 7));
    return d.toISOString().split("T")[0];
  }
  const thisSat = nextDay(6);
  const nextSat = (() => { const d = new Date(thisSat); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })();
  const tmrw = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

  function prevMonth() { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); }
  function nextMo() { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function pickQuick(dateStr) {
    setSelDate(dateStr);
    const d = new Date(dateStr);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
  }

  return (
    <OcvModal open={open} onClose={onClose} title={title || "Pick a date & time"}>
      {/* Quick picks */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        <button onClick={() => pickQuick(tmrw)} className="qp">Tomorrow</button>
        <button onClick={() => pickQuick(thisSat)} className="qp">This Sat</button>
        <button onClick={() => pickQuick(nextSat)} className="qp">Next Sat</button>
      </div>

      {/* Month nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--bd)", background: "#fff", cursor: "pointer", fontSize: 16, color: "var(--tx)" }}>‹</button>
        <span style={{ fontFamily: "var(--sr)", fontSize: 16, fontWeight: 700, color: "var(--g)" }}>{monthName}</span>
        <button onClick={nextMo} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--bd)", background: "#fff", cursor: "pointer", fontSize: 16, color: "var(--tx)" }}>›</button>
      </div>

      {/* Day headers */}
      <div className="dp-grid" style={{ marginBottom: 4 }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="dp-head">{d}</div>)}
      </div>

      {/* Day cells */}
      <div className="dp-grid" style={{ marginBottom: 20 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
          const isToday = dateStr === todayStr;
          const isSel = dateStr === selDate;
          const isPast = dateStr < todayStr;
          return (
            <button key={i} onClick={() => !isPast && setSelDate(dateStr)} disabled={isPast}
              className={"dp-cell" + (isSel ? " sel" : "") + (isToday ? " today" : "")}
              style={{ opacity: isPast ? .3 : 1 }}>{d}</button>
          );
        })}
      </div>

      {/* Time selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "var(--g)", marginBottom: 8, display: "block" }}>Time</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"].map(t =>
            <button key={t} onClick={() => setSelTime(t)} className="qp" style={{ flex: "0 0 auto", borderColor: selTime === t ? "var(--g)" : "var(--bd)", color: selTime === t ? "var(--g)" : "var(--tx)", background: selTime === t ? "var(--gxl)" : "#fff", fontWeight: selTime === t ? 700 : 500 }}>{t}</button>
          )}
        </div>
      </div>

      {/* Confirm */}
      <button onClick={() => { if (selDate) { onSelect(selDate, selTime); onClose(); } }} className="btn bp" disabled={!selDate}>
        {selDate ? "Add to schedule — " + new Date(selDate + "T00:00:00").toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" }) + " at " + selTime : "Pick a date above"}
      </button>
    </OcvModal>
  );
}
