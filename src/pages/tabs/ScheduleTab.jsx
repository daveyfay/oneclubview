import React, { useState } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import WeekGrid from '../../components/hub/WeekGrid';
import EventDetailModal from '../../components/modals/EventDetailModal';
import ICN from '../../lib/icons';
import { COLS } from '../../lib/constants';
import { track, showToast, isToday, fmtDate } from '../../lib/utils';
import { db } from '../../lib/supabase';

export default function ScheduleTab({ filter }) {
  const {
    kids, clubs, recs, mans, pays, camps, campBookings,
    holidays, userHolidays,
    isAdmin, members, wd, clubMap, clubTermMap, kidMap,
    getMemberCol, user, profile, load, loading, familyMembers, weekEvts,
  } = useHubData();

  const [weekView, setWeekView] = useState("grid");
  const [selectedDay, setSelectedDay] = useState(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [tapEvent, setTapEvent] = useState(null);

  function handleTapEvent(e) { setTapEvent(e); }

  if (loading) return (
    <ErrorBoundary label="Schedule">
      <div style={{ padding: '4px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[0,1,2,3,4,5,6].map(i => <div key={i} className="skeleton-shimmer" style={{ width: 44, height: 56, borderRadius: 12 }} />)}
        </div>
        {[0,1,2,3].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 56, borderRadius: 12, marginBottom: 8 }} />)}
      </div>
    </ErrorBoundary>
  );

  const activeWeekEvts = weekEvts.filter(e => !e.skipped);
  const filtEvts = filter === "all" ? activeWeekEvts : activeWeekEvts.filter(e => e.memberId === filter);

  return (
    <ErrorBoundary label="Schedule">
      <div>
        {/* WEEK/MONTH HEADER + DAY PILLS */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 800, color: "var(--color-primary)" }}>This week</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {["grid", "list", "calendar"].map(v => <button key={v} onClick={() => { track("view_toggle", { view: v }); setWeekView(v); setSelectedDay(null) }} style={{ fontSize: 11, fontWeight: 600, color: weekView === v ? "var(--color-accent)" : "var(--color-muted)", background: weekView === v ? "var(--color-accent-bg)" : "none", border: weekView === v ? "1px solid #f8c4bc" : "1px solid transparent", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontFamily: "var(--font-sans)", textTransform: "capitalize" }}>{v}</button>)}
          </div>
        </div>

        {/* HORIZONTAL DAY PILLS */}
        {weekView !== "grid" && <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
          {wd.map(d => {
            const today = isToday(d);
            const sel = selectedDay && selectedDay.getDate() === d.getDate() && selectedDay.getMonth() === d.getMonth() && selectedDay.getFullYear() === d.getFullYear();
            const dayEvts = weekEvts.filter(e => e.date.getFullYear() === d.getFullYear() && e.date.getMonth() === d.getMonth() && e.date.getDate() === d.getDate());
            return <div key={d.toISOString()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 44, padding: "6px 4px", borderRadius: 12, background: today ? "var(--color-primary)" : sel ? "var(--color-primary-bg)" : "transparent", cursor: "pointer", border: sel && !today ? "1.5px solid var(--color-primary)" : "1.5px solid transparent" }} onClick={() => setSelectedDay(sel ? null : d)}>
              <span style={{ fontSize: 10, fontWeight: 700, color: today ? "rgba(255,255,255,.7)" : "var(--color-muted)", textTransform: "uppercase" }}>{d.toLocaleDateString("en-IE", { weekday: "short" }).slice(0, 3)}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: today ? "#fff" : "var(--color-text)" }}>{d.getDate()}</span>
              {dayEvts.length > 0 && <div style={{ width: 14, height: 3, borderRadius: 2, background: today ? "rgba(255,255,255,.35)" : "var(--color-accent)", marginTop: 1 }} />}
            </div>;
          })}
        </div>}

        {/* INSIGHT CARDS */}
        {(() => {
          const now = new Date();
          const thisWeekCount = filtEvts.length;
          const nextHol = (holidays || []).find(h => new Date(h.start_date) > now);
          const daysToHol = nextHol ? Math.ceil((new Date(nextHol.start_date) - now) / (86400000)) : null;
          const unpaidCount = isAdmin ? (pays || []).filter(p => !p.paid && p.status !== "not_renewing").length : 0;
          const unpaidTotal = isAdmin ? (pays || []).filter(p => !p.paid && p.status !== "not_renewing").reduce((s, p) => s + parseFloat(p.amount || 0), 0) : 0;

          return <div style={{ display: "flex", gap: 14, padding: "0 0 16px", fontSize: 13, color: "var(--color-muted)", flexWrap: "wrap" }}>
            <span><strong style={{ color: "var(--color-primary)", fontWeight: 700 }}>{thisWeekCount}</strong> activities</span>
            {nextHol && daysToHol !== null && daysToHol <= 60 && <><span style={{ color: "var(--color-border)" }}>{"\u00B7"}</span><span><strong style={{ color: "#c49000", fontWeight: 700 }}>{daysToHol}</strong> days to {nextHol.name}</span></>}
            {isAdmin && unpaidCount > 0 && <><span style={{ color: "var(--color-border)" }}>{"\u00B7"}</span><span style={{ cursor: "pointer" }}><strong style={{ color: "var(--color-accent)", fontWeight: 700 }}>{"\u20AC"}{unpaidTotal.toFixed(0)}</strong> due</span></>}
          </div>;
        })()}

        {/* SELECTED DAY PANEL */}
        {(weekView === "list" || weekView === "grid") && selectedDay && (() => {
          const dayEvts = weekEvts.filter(e => e.date.getFullYear() === selectedDay.getFullYear() && e.date.getMonth() === selectedDay.getMonth() && e.date.getDate() === selectedDay.getDate());
          const isHol = (holidays || []).some(h => { const s = new Date(h.start_date), e = new Date(h.end_date); return selectedDay >= s && selectedDay <= e });
          const holName = isHol ? (holidays || []).find(h => selectedDay >= new Date(h.start_date) && selectedDay <= new Date(h.end_date))?.name : "";
          return <div style={{ marginBottom: 14, background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", boxShadow: "var(--shadow)", overflow: "hidden", animation: "slideUp .2s ease" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)" }}>{selectedDay.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" })}</div>
                {isHol && <div style={{ fontSize: 11, color: "#b8860b", fontWeight: 600 }}>{holName}</div>}
              </div>
              <button onClick={() => setSelectedDay(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}>{"\u2715"}</button>
            </div>
            <div style={{ padding: "8px 12px", maxHeight: 240, overflowY: "auto" }}>
              {dayEvts.length === 0 ? <div style={{ padding: "16px 0", textAlign: "center", color: "var(--color-muted)", fontSize: 13 }}>{isHol ? "School holiday \u2014 no activities" : "No activities this day"}</div>
              : dayEvts.map((e, i) => <div key={e.id || i} className="stagger-card" style={{ animationDelay: (i * 50) + "ms" }} onClick={() => handleTapEvent(e)}>
                <div style={{ display: "flex", alignItems: "stretch", gap: 0, borderRadius: 12, overflow: "hidden", background: "var(--bg)", border: "1px solid var(--color-border)", marginBottom: 6, cursor: "pointer", transition: "transform .1s" }} onTouchStart={ev => ev.currentTarget.style.transform = "scale(.98)"} onTouchEnd={ev => ev.currentTarget.style.transform = ""}>
                <div style={{ width: 4, background: getMemberCol(e.memberId, e.colour), flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{e.source_type === "camp" ? "\u{1F3D5}\uFE0F " : ""}{e.club || e.title || ""}</div>
                    <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 1 }}>{e.member}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)", fontVariantNumeric: "tabular-nums" }}>{e.time || ""}{e.endTime ? "\u2013" + e.endTime : ""}</div>
                      {e.driver && <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 1, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}><span style={{ color: "var(--color-muted)" }}>{ICN.car}</span> {e.driver}</div>}
                    </div>
                    <span style={{ color: "#ddd" }}>{ICN.chevron}</span>
                  </div>
                </div>
                </div>
              </div>)}
            </div>
          </div>;
        })()}

        {/* MONTH CALENDAR VIEW */}
        {weekView === "calendar" && (() => {
          const now = new Date();
          const month = calMonth, year = calYear;
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const startOffset = (firstDay + 6) % 7;
          const cells = [];
          for (let i = 0; i < startOffset; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);

          // Pre-compute events for all days in month
          const monthEvtsMap = {};
          for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(year, month, day);
            const dow = cellDate.getDay();
            const evts = [];
            (recs || []).forEach(re => {
              if (!re.active || re.day_of_week !== dow) return;
              const term = clubTermMap.get(re.club_id);
              if (term && (cellDate < term.start || cellDate > term.end)) return;
              const dStr = cellDate.toISOString().split("T")[0];
              if ((re.excluded_dates || []).includes(dStr)) return;
              const cl = clubMap.get(re.club_id);
              const kid = re.dependant_id ? kidMap.get(re.dependant_id) : null;
              evts.push({ id: re.id + cellDate.toISOString(), source_id: re.id, source_type: "recurring", title: re.title, date: cellDate, time: re.start_time?.slice(0, 5) || "",
                endTime: re.start_time && re.duration_minutes ? ((() => { const t = parseInt(re.start_time.slice(0, 2)) * 60 + parseInt(re.start_time.slice(3, 5)) + re.duration_minutes; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0") })()) : "",
                club: cl?.nickname || cl?.club_name || "", colour: cl?.colour || "#999", member: kid?.first_name || (profile?.first_name || "You"), memberId: re.dependant_id || "self", driver: re.driver || null });
            });
            (mans || []).forEach(me => {
              const d = new Date(me.event_date);
              if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
                const cl = clubMap.get(me.club_id);
                const kid = me.dependant_id ? kidMap.get(me.dependant_id) : null;
                const mTime = d.toTimeString().slice(0, 5);
                const mEnd = me.duration_minutes && mTime ? ((() => { const t = parseInt(mTime.slice(0, 2)) * 60 + parseInt(mTime.slice(3, 5)) + (me.duration_minutes || 60); return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0") })()) : "";
                const mAtt = me.description && me.description.startsWith("Going: ") ? me.description.replace("Going: ", "").split(", ").filter(Boolean) : [];
                evts.push({ id: me.id, source_id: me.id, source_type: "manual", title: me.title, date: d, time: mTime, endTime: mEnd, club: cl?.nickname || cl?.club_name || "", colour: me.colour || cl?.colour || "#999", member: kid?.first_name || (profile?.first_name || "You"), memberId: me.dependant_id || "self", attendees: mAtt, location: me.location || null });
              }
            });
            // Camp bookings
            (campBookings || []).forEach(b => {
              if (!b.camp_id) return;
              const camp = (camps || []).find(c => c.id === b.camp_id);
              if (!camp || !camp.start_date) return;
              const cs = new Date(camp.start_date), ce = new Date(camp.end_date || camp.start_date);
              if (cellDate >= cs && cellDate <= ce && cellDate.getDay() !== 0 && cellDate.getDay() !== 6) {
                const kid = b.dependant_id ? kidMap.get(b.dependant_id) : null;
                evts.push({ id: "camp-" + b.id + "-" + day, source_id: b.id, source_type: "camp", title: camp.title, date: cellDate, time: camp.daily_start_time?.slice(0, 5) || "09:00", endTime: camp.daily_end_time?.slice(0, 5) || "15:00", club: camp.title, colour: "#e85d4a", member: kid?.first_name || (profile?.first_name || "You"), memberId: b.dependant_id || "self" });
              }
            });
            // Payment reminders on due date
            (pays || []).filter(p => !p.paid && p.status !== "not_renewing" && p.due_date).forEach(p => {
              const pd = new Date(p.due_date + "T00:00:00");
              if (pd.getDate() === day && pd.getMonth() === month && pd.getFullYear() === year) {
                const cl = clubMap.get(p.club_id);
                const kid = p.dependant_id ? kidMap.get(p.dependant_id) : null;
                evts.push({ id: "pay-" + p.id, source_id: p.id, source_type: "payment", title: "\u{1F4B3} " + p.description + " \u2014 \u20AC" + parseFloat(p.amount).toFixed(2), date: cellDate, time: "", endTime: "", club: cl?.nickname || cl?.club_name || "Payment due", colour: "#c4960c", member: kid?.first_name || (profile?.first_name || "You"), memberId: p.dependant_id || "self", isPayment: true, payAmount: parseFloat(p.amount), payDescription: p.description, payDueDate: p.due_date, payClub: cl?.nickname || cl?.club_name || "" });
              }
            });
            monthEvtsMap[day] = evts.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
          }
          const monthEvts = (day) => monthEvtsMap[day] || [];

          const prevMonth = () => { if (month === 0) { setCalMonth(11); setCalYear(year - 1) } else setCalMonth(month - 1); setSelectedDay(null) };
          const nextMonth = () => { if (month === 11) { setCalMonth(0); setCalYear(year + 1) } else setCalMonth(month + 1); setSelectedDay(null) };
          const goToday = () => { setCalMonth(now.getMonth()); setCalYear(now.getFullYear()); setSelectedDay(null) };

          return <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <button onClick={prevMonth} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: "4px 8px", color: "var(--color-primary-light)" }}>{"\u2039"}</button>
              <span onClick={goToday} style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 700, color: "var(--color-primary)", cursor: "pointer" }}>{new Date(year, month).toLocaleDateString("en-IE", { month: "long", year: "numeric" })}</span>
              <button onClick={nextMonth} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: "4px 8px", color: "var(--color-primary-light)" }}>{"\u203A"}</button>
            </div>
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--color-muted)", padding: "2px 0" }}>{d}</div>)}
            </div>
            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const cellDate = new Date(year, month, day);
                const isToday2 = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const dayEvts = monthEvts(day);
                const isHoliday = (holidays || []).some(h => { const s = new Date(h.start_date), e = new Date(h.end_date); return cellDate >= s && cellDate <= e });
                const isSelected = selectedDay && selectedDay.getDate() === day && selectedDay.getMonth() === month && selectedDay.getFullYear() === year;
                return <div key={i} style={{ textAlign: "center", padding: "6px 2px", borderRadius: 10, background: isToday2 ? "var(--color-primary)" : isSelected ? "var(--color-primary-bg)" : isHoliday ? "#fef3e2" : "transparent", cursor: "pointer", position: "relative", border: isSelected ? "1.5px solid var(--color-primary)" : "1.5px solid transparent" }} onClick={() => setSelectedDay(cellDate)}>
                  <span style={{ fontSize: 13, fontWeight: isToday2 || isSelected ? 800 : 500, color: isToday2 ? "#fff" : isHoliday ? "#b8860b" : "var(--color-text)" }}>{day}</span>
                  {dayEvts.length > 0 && <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 2 }}>
                    {dayEvts.slice(0, 3).map((e, j) => <div key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: isToday2 ? "rgba(255,255,255,.6)" : getMemberCol(e.memberId, e.colour) }} />)}
                  </div>}
                </div>;
              })}
            </div>

            {/* SLIDE-UP DAY PANEL */}
            {selectedDay && selectedDay.getMonth() === month && selectedDay.getFullYear() === year && (() => {
              const dayE = monthEvts(selectedDay.getDate());
              const isHol = (holidays || []).some(h => { const s = new Date(h.start_date), e = new Date(h.end_date); return selectedDay >= s && selectedDay <= e });
              const holName = isHol ? (holidays || []).find(h => selectedDay >= new Date(h.start_date) && selectedDay <= new Date(h.end_date))?.name : "";
              return <div style={{ marginTop: 12, background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", boxShadow: "var(--shadow)", overflow: "hidden", animation: "slideUp .2s ease" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)" }}>{selectedDay.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" })}</div>
                    {isHol && <div style={{ fontSize: 11, color: "#b8860b", fontWeight: 600 }}>{holName}</div>}
                  </div>
                  <button onClick={() => setSelectedDay(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}>{"\u2715"}</button>
                </div>
                <div style={{ padding: "8px 12px", maxHeight: 240, overflowY: "auto" }}>
                  {dayE.length === 0 ? <div style={{ padding: "16px 0", textAlign: "center", color: "var(--color-muted)", fontSize: 13 }}>No activities this day</div>
                  : dayE.map((e, i) => <div key={e.id || i} onClick={() => handleTapEvent(e)} style={{ display: "flex", alignItems: "stretch", gap: 0, borderRadius: 12, overflow: "hidden", background: "var(--bg)", border: "1px solid var(--color-border)", marginBottom: 6, cursor: "pointer", transition: "transform .1s" }} onTouchStart={ev => ev.currentTarget.style.transform = "scale(.98)"} onTouchEnd={ev => ev.currentTarget.style.transform = ""}>
                    <div style={{ width: 4, background: getMemberCol(e.memberId, e.colour), flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{e.source_type === "camp" ? "\u{1F3D5}\uFE0F " : ""}{e.club || e.title || ""}</div>
                        <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 1 }}>{e.member}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)", fontVariantNumeric: "tabular-nums" }}>{e.time || ""}{e.endTime ? "\u2013" + e.endTime : ""}</div>
                          {e.driver && <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 1, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}><span style={{ color: "var(--color-muted)" }}>{ICN.car}</span> {e.driver}</div>}
                        </div>
                        <span style={{ color: "#ddd" }}>{ICN.chevron}</span>
                      </div>
                    </div>
                  </div>)}
                </div>
              </div>;
            })()}
          </div>;
        })()}

        {/* WEEKLY GRID VIEW */}
        {weekView === "grid" && <WeekGrid weekDays={wd} events={filtEvts} holidays={[...(holidays || []), ...(userHolidays || [])]} onTapEvent={handleTapEvent} kids={kids} />}

        {/* SWIMLANE LIST VIEW */}
        {weekView === "list" && <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
          {wd.map(d => {
            const dayEvts = (filter === "all" ? weekEvts : weekEvts.filter(e => e.memberId === filter)).filter(e => e.date.getFullYear() === d.getFullYear() && e.date.getMonth() === d.getMonth() && e.date.getDate() === d.getDate());
            const today = isToday(d);
            if (dayEvts.length === 0 && !today) return null;
            const memberEvts = {};
            dayEvts.forEach(e => {
              const key = e.memberId || e.member;
              if (!memberEvts[key]) memberEvts[key] = { name: e.member, events: [] };
              memberEvts[key].events.push(e);
            });
            const lanes = Object.values(memberEvts);
            return <div key={d.toISOString()} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: today ? "var(--color-accent)" : "var(--color-card)", border: today ? "none" : "1px solid var(--color-border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: today ? "0 4px 12px rgba(232,93,74,.25)" : "var(--shadow)" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: today ? "rgba(255,255,255,.7)" : "var(--color-muted)", textTransform: "uppercase" }}>{d.toLocaleDateString("en-IE", { weekday: "short" })}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: today ? "#fff" : "var(--color-text)", lineHeight: 1 }}>{d.getDate()}</span>
                </div>
                {today && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: .5 }}>Today</span>}
              </div>
              {lanes.length === 0 ? <div style={{ padding: "8px 0 4px 48px", fontSize: 13, color: "var(--color-muted)" }}>Free day {"\u2728"}</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 48 }}>
                {lanes.map((lane, li) => lane.events.map((e, ei) => {
                  const kidIdx = kids.findIndex(k => k.id === e.memberId);
                  const memberCol = kidIdx >= 0 ? COLS[kidIdx % COLS.length] : (e.colour || COLS[li % COLS.length]);
                  return <div key={e.id || li + "-" + ei} className="stagger-card" style={{ animationDelay: (li * 50 + ei * 50) + "ms", display: "flex", alignItems: "stretch", gap: 0, borderRadius: 14, overflow: "hidden", background: e.skipped ? "#f9f9f9" : "var(--color-card)", border: "1px solid var(--color-border)", boxShadow: e.skipped ? "none" : "var(--shadow)", cursor: "pointer", opacity: e.skipped ? .5 : 1 }} onClick={() => handleTapEvent(e)}>
                    <div style={{ width: 5, background: e.skipped ? "var(--color-border)" : memberCol, flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: e.skipped ? "var(--color-muted)" : "var(--color-text)", textDecoration: e.skipped ? "line-through" : "none" }}>{e.club || e.title || ""}{e.skipped ? " \u2014 Skipped" : ""}</div>
                        <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 1 }}>{e.member}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)", fontVariantNumeric: "tabular-nums" }}>{e.time || ""}{e.endTime ? "\u2013" + e.endTime : ""}</div>
                          {e.driver && <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 1, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}><span style={{ color: "var(--color-muted)" }}>{ICN.car}</span> {e.driver}</div>}
                        </div>
                        <span style={{ color: "#ddd" }}>{ICN.chevron}</span>
                      </div>
                    </div>
                  </div>
                }))}
              </div>}
            </div>;
          })}
        </div>}

        {/* FORWARD BANNER */}
        <div style={{ background: "var(--color-primary)", borderRadius: 14, padding: 16, marginTop: 16, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ color: "rgba(255,255,255,.5)" }}>{ICN.mail}</span><span style={{ fontSize: 14, fontWeight: 700 }}>Forward club emails</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.7)", marginBottom: 3 }}>{"\u{1F4E7}"} Email from a club?</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", lineHeight: 1.3 }}>Forward it to:</div>
              <span onClick={() => navigator.clipboard?.writeText("schedule@geovoriofi.resend.app")} style={{ display: "inline-block", padding: "4px 8px", background: "rgba(255,255,255,.1)", borderRadius: 5, fontSize: 10, fontWeight: 700, fontFamily: "monospace", marginTop: 4, cursor: "pointer" }}>schedule@geovoriofi.resend.app {"\u{1F4CB}"}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#25D366", marginBottom: 3 }}>{"\u{1F4AC}"} WhatsApp from a coach?</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", lineHeight: 1.3 }}>Long-press message {"\u2192"} Share {"\u2192"} Mail {"\u2192"} forward to the address above</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 8 }}>We auto-update your schedule, fees, and terms.</div>
        </div>

        {/* EventDetailModal */}
        <EventDetailModal event={tapEvent} open={!!tapEvent} onClose={() => setTapEvent(null)}
          adults={[...new Set([profile?.first_name || "Me", ...familyMembers.filter(m => m.id !== user.id && !kids.find(k => k.first_name === m.first_name)).map(m => m.first_name)].filter(Boolean))]}
          familyAll={[...new Set([profile?.first_name || "Me", ...kids.map(k => k.first_name), ...familyMembers.filter(m => m.id !== user.id).map(m => m.first_name)].filter(Boolean))]}
          onDriverChange={async (ev, driver) => {
            if (ev.source_type === "recurring") {
              await db("recurring_events", "PATCH", { filters: ["id=eq." + ev.source_id], body: { driver } });
              showToast(driver + " is driving"); setTapEvent({ ...ev, driver }); load();
            }
          }}
          onAttendeesChange={async (ev, attendees) => {
            if (ev.source_type === "manual" && ev.source_id) {
              await db("manual_events", "PATCH", { filters: ["id=eq." + ev.source_id], body: { description: attendees.length > 0 ? "Going: " + attendees.join(", ") : "" } });
            }
          }}
          onDelete={async (ev) => {
            if (ev.source_type === "manual") {
              await db("manual_events", "DELETE", { filters: ["id=eq." + ev.source_id] });
              showToast("Removed from schedule"); setTapEvent(null); load();
            } else if (ev.source_type === "recurring") {
              const dateStr = ev.date.toISOString().split("T")[0];
              const rec = recs.find(r => r.id === ev.source_id);
              const excluded = [...(rec?.excluded_dates || []), dateStr];
              await db("recurring_events", "PATCH", { filters: ["id=eq." + ev.source_id], body: { excluded_dates: excluded } });
              showToast("Skipped for this week"); setTapEvent(null); load();
            }
          }}
          onMarkPaid={async (ev) => {
            if (ev.source_type === "payment" && ev.source_id) {
              await db("payment_reminders", "PATCH", { filters: ["id=eq." + ev.source_id], body: { paid: true, paid_at: new Date().toISOString() } });
              showToast("Marked as paid!"); setTapEvent(null); load();
            }
          }}
          onColourChange={async (ev, col) => {
            if (ev.source_type !== "manual") return;
            await db("manual_events", "PATCH", { filters: ["id=eq." + ev.source_id], body: { colour: col } });
            setTapEvent({ ...ev, colour: col }); load();
          }} />
      </div>
    </ErrorBoundary>
  );
}
