import React, { useState, useMemo } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import AddPaymentModal from '../../components/modals/AddPaymentModal';
import { showToast, isToday } from '../../lib/utils';
import { db } from '../../lib/supabase';

export default function MoneyTab({ filter }) {
  const {
    kids, clubs, pays, holidays,
    isAdmin, wd, clubMap, clubTermMap, kidMap,
    getMemberCol, user, profile, load, recs, mans,
  } = useHubData();

  const [showAddPay, setShowAddPay] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const filtPays = filter === "all" ? pays : pays.filter(p => (p.dependant_id || "self") === filter);
  const totalDue = filtPays.filter(p => !p.paid && p.status !== "not_renewing").reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalPaid = filtPays.filter(p => p.paid).reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  // Build weekly events for day panel
  const weekEvts = useMemo(() => {
    const evts = [];
    (recs || []).forEach(re => {
      if (!re.active) return;
      wd.forEach(d => {
        if (d.getDay() === re.day_of_week) {
          const term = clubTermMap.get(re.club_id);
          if (term && (d < term.start || d > term.end)) return;
          const dStr = d.toISOString().split("T")[0];
          const isSkipped = (re.excluded_dates || []).includes(dStr);
          if (isSkipped) return;
          const cl = clubMap.get(re.club_id);
          const kid = re.dependant_id ? kidMap.get(re.dependant_id) : null;
          evts.push({ id: re.id + d.toISOString(), source_type: "recurring", title: re.title, date: d, time: re.start_time?.slice(0, 5) || "",
            endTime: re.start_time && re.duration_minutes ? ((() => { const t = parseInt(re.start_time.slice(0, 2)) * 60 + parseInt(re.start_time.slice(3, 5)) + re.duration_minutes; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0") })()) : "",
            club: cl?.nickname || cl?.club_name || "", colour: cl?.colour || "#999", member: kid?.first_name || (profile?.first_name || "You"), memberId: re.dependant_id || "self" });
        }
      });
    });
    (mans || []).forEach(me => {
      const d = new Date(me.event_date);
      const end = new Date(wd[6]); end.setDate(end.getDate() + 1);
      if (d >= wd[0] && d < end) {
        const cl = clubMap.get(me.club_id);
        const kid = me.dependant_id ? kidMap.get(me.dependant_id) : null;
        const mTime = d.toTimeString().slice(0, 5);
        const mEnd = me.duration_minutes && mTime ? ((() => { const t = parseInt(mTime.slice(0, 2)) * 60 + parseInt(mTime.slice(3, 5)) + (me.duration_minutes || 60); return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0") })()) : "";
        evts.push({ id: me.id, source_type: "manual", title: me.title, date: d, time: mTime, endTime: mEnd, club: cl?.nickname || cl?.club_name || "", colour: me.colour || cl?.colour || "#999", member: kid?.first_name || (profile?.first_name || "You"), memberId: me.dependant_id || "self" });
      }
    });
    return evts.sort((a, b) => a.date - b.date || (a.time || "").localeCompare(b.time || ""));
  }, [recs, mans, clubMap, clubTermMap, kidMap, profile, wd]);

  return (
    <ErrorBoundary label="Money">
      <div>
        {/* WEEK/MONTH HEADER */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ fontFamily: "var(--sr)", fontSize: 20, fontWeight: 800, color: "var(--g)" }}>This week</h2>
        </div>

        {/* HORIZONTAL DAY PILLS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="hsb">
          {wd.map(d => {
            const today = isToday(d);
            const sel = selectedDay && selectedDay.getDate() === d.getDate() && selectedDay.getMonth() === d.getMonth() && selectedDay.getFullYear() === d.getFullYear();
            const dayEvts = weekEvts.filter(e => e.date.getFullYear() === d.getFullYear() && e.date.getMonth() === d.getMonth() && e.date.getDate() === d.getDate());
            return <div key={d.toISOString()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 44, padding: "6px 4px", borderRadius: 12, background: today ? "var(--g)" : sel ? "var(--gxl)" : "transparent", cursor: "pointer", border: sel && !today ? "1.5px solid var(--g)" : "1.5px solid transparent" }} onClick={() => setSelectedDay(sel ? null : d)}>
              <span style={{ fontSize: 10, fontWeight: 700, color: today ? "rgba(255,255,255,.7)" : "var(--mt)", textTransform: "uppercase" }}>{d.toLocaleDateString("en-IE", { weekday: "short" }).slice(0, 3)}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: today ? "#fff" : "var(--tx)" }}>{d.getDate()}</span>
              {dayEvts.length > 0 && <div style={{ width: 14, height: 3, borderRadius: 2, background: today ? "rgba(255,255,255,.35)" : "var(--acc)", marginTop: 1 }} />}
            </div>;
          })}
        </div>

        {/* DAY PANEL */}
        {selectedDay && (() => {
          const dayEvts = weekEvts.filter(e => e.date.getFullYear() === selectedDay.getFullYear() && e.date.getMonth() === selectedDay.getMonth() && e.date.getDate() === selectedDay.getDate());
          const isHol = (holidays || []).some(h => { const s = new Date(h.start_date), e = new Date(h.end_date); return selectedDay >= s && selectedDay <= e });
          const holName = isHol ? (holidays || []).find(h => selectedDay >= new Date(h.start_date) && selectedDay <= new Date(h.end_date))?.name : "";
          return <div style={{ marginBottom: 14, background: "var(--card)", borderRadius: 16, border: "1px solid var(--bd)", boxShadow: "var(--shadow)", overflow: "hidden", animation: "slideUp .2s ease" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bd)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--g)" }}>{selectedDay.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" })}</div>
                {isHol && <div style={{ fontSize: 11, color: "#b8860b", fontWeight: 600 }}>{holName}</div>}
              </div>
              <button onClick={() => setSelectedDay(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--mt)", padding: "4px" }}>{"\u2715"}</button>
            </div>
            <div style={{ padding: "8px 12px", maxHeight: 200, overflowY: "auto" }}>
              {dayEvts.length === 0 ? <div style={{ padding: "12px 0", textAlign: "center", color: "var(--mt)", fontSize: 13 }}>{isHol ? "School holiday \u2014 no activities scheduled" : "Nothing scheduled this day"}</div>
              : dayEvts.map((e, i) => <div key={e.id || i} style={{ display: "flex", alignItems: "stretch", gap: 0, borderRadius: 12, overflow: "hidden", background: "var(--bg)", border: "1px solid var(--bd)", marginBottom: 6 }}>
                <div style={{ width: 4, background: getMemberCol(e.memberId, e.colour), flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{e.source_type === "camp" ? "\u{1F3D5}\uFE0F " : ""}{e.club || e.title || ""}</div>
                    <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 1 }}>{e.member}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--g)", fontVariantNumeric: "tabular-nums" }}>{e.time || ""}{e.endTime ? "\u2013" + e.endTime : ""}</div>
                  </div>
                </div>
              </div>)}
            </div>
          </div>;
        })()}

        {/* Spend summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={{ background: "var(--card)", borderRadius: 14, padding: 12, border: "1px solid var(--bd)", textAlign: "center", boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--g)", fontFamily: "var(--sr)" }}>{"\u20AC"}{filtPays.reduce((s, p) => s + parseFloat(p.amount || 0), 0).toFixed(0)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--mt)", marginTop: 2 }}>Total tracked</div>
          </div>
          <div style={{ background: "var(--card)", borderRadius: 14, padding: 12, border: "1px solid var(--bd)", textAlign: "center", boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a", fontFamily: "var(--sr)" }}>{"\u20AC"}{filtPays.filter(p => p.paid).reduce((s, p) => s + parseFloat(p.amount || 0), 0).toFixed(0)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--mt)", marginTop: 2 }}>Paid</div>
          </div>
          <div style={{ background: "var(--card)", borderRadius: 14, padding: 12, border: "1px solid var(--bd)", textAlign: "center", boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--acc)", fontFamily: "var(--sr)" }}>{"\u20AC"}{filtPays.filter(p => !p.paid).reduce((s, p) => s + parseFloat(p.amount || 0), 0).toFixed(0)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--mt)", marginTop: 2 }}>Outstanding</div>
          </div>
        </div>

        {(() => {
          const overdue = filtPays.filter(p => !p.paid && new Date(p.due_date) < new Date());
          if (overdue.length === 0) return null;
          const total = overdue.reduce((s, p) => s + parseFloat(p.amount), 0);
          return <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{"\u{1F6A8}"}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{"\u20AC"}{total.toFixed(0)} overdue</div>
              <div style={{ fontSize: 12, color: "#991b1b" }}>{overdue.length} payment{overdue.length > 1 ? "s" : ""} past due date</div>
            </div>
          </div>;
        })()}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "var(--accl)", borderRadius: 14, padding: 16, border: "1px solid #f0d078" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#c44030", fontFamily: "var(--sr)" }}>{"\u20AC"}{totalDue.toFixed(0)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#a68600", marginTop: 2 }}>Outstanding</div>
          </div>
          <div style={{ background: "var(--gxl)", borderRadius: 14, padding: 16, border: "1px solid #c8e6c9" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--g)", fontFamily: "var(--sr)" }}>{"\u20AC"}{totalPaid.toFixed(0)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gl)", marginTop: 2 }}>Paid</div>
          </div>
        </div>
        {filtPays.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "var(--mt)" }}><div style={{ fontSize: 36, marginBottom: 8 }}>{"\u{1F4B3}"}</div><p style={{ fontSize: 14 }}>No payment reminders yet</p></div>
        : filtPays.map(p => {
          const overdue = !p.paid && new Date(p.due_date) < new Date();
          const kid = p.dependant_id ? kids.find(k => k.id === p.dependant_id) : null;
          const cl = clubs.find(c => c.club_id === p.club_id);
          return <div key={p.id} style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--bd)", boxShadow: "var(--shadow)", padding: 16, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>{kid?.first_name || profile?.first_name || "You"} {"\u2014"} {p.description}</div><div style={{ fontSize: 12, color: "var(--mt)", marginTop: 2 }}>{cl?.club_name || ""} {"\u2022"} Due {new Date(p.due_date).toLocaleDateString("en-IE", { day: "numeric", month: "short" })}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 800, color: p.paid ? "var(--gl)" : p.status === "not_renewing" ? "#888" : overdue ? "#dc2626" : "var(--tx)", fontFamily: "var(--sr)", textDecoration: p.status === "not_renewing" ? "line-through" : "none" }}>{"\u20AC"}{parseFloat(p.amount).toFixed(0)}</div>
                {isAdmin && !p.paid && p.status !== "not_renewing" && <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "flex-end" }}>
                  <button onClick={async () => { try { await db("payment_reminders", "PATCH", { body: { paid: true }, filters: ["id=eq." + p.id] }); showToast("Marked as paid"); await load() } catch (e) { showToast("Failed to update. Try again.", "err") } }} style={{ fontSize: 11, fontWeight: 700, color: "var(--gl)", background: "var(--gxl)", border: "none", borderRadius: 8, padding: "3px 10px", cursor: "pointer" }}>Paid</button>
                  <button onClick={async () => { try { await db("payment_reminders", "PATCH", { body: { status: "not_renewing" }, filters: ["id=eq." + p.id] }); await load() } catch (e) { showToast("Failed to update. Try again.", "err") } }} style={{ fontSize: 11, fontWeight: 700, color: "#888", background: "#f3f3f3", border: "none", borderRadius: 8, padding: "3px 10px", cursor: "pointer" }}>Not renewing</button>
                </div>}
                {p.status === "not_renewing" && <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "flex-end", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Not renewing</span>
                  <button onClick={async () => { try { await db("payment_reminders", "DELETE", { filters: ["id=eq." + p.id] }); await load() } catch (e) { showToast("Failed to remove. Try again.", "err") } }} style={{ fontSize: 10, fontWeight: 600, color: "#dc2626", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Remove</button>
                </div>}
                {p.paid && <span style={{ fontSize: 11, color: "var(--gl)", fontWeight: 700 }}>{"\u2713"} Paid</span>}
              </div>
            </div>
          </div>
        })}
        {isAdmin && <button onClick={() => setShowAddPay(true)} style={{ width: "100%", padding: 14, borderRadius: 14, border: "2px dashed var(--bd)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--mt)", fontFamily: "var(--sn)", marginTop: 8 }}>+ Add payment reminder</button>}

        {showAddPay && <AddPaymentModal clubs={clubs} userId={user.id} kids={kids} profile={profile} onClose={() => setShowAddPay(false)} onSaved={() => { setShowAddPay(false); window.__hapticSuccess && window.__hapticSuccess(); load() }} />}
      </div>
    </ErrorBoundary>
  );
}
