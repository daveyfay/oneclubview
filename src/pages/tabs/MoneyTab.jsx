import React, { useState } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import AddPaymentModal from '../../components/modals/AddPaymentModal';
import { showToast, isToday } from '../../lib/utils';
import { db } from '../../lib/supabase';

export default function MoneyTab({ filter }) {
  const {
    kids, clubs, pays, holidays,
    isAdmin, wd, clubMap, clubTermMap, kidMap,
    getMemberCol, user, profile, load, loading, recs, mans, weekEvts,
  } = useHubData();

  const [showAddPay, setShowAddPay] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  if (loading) return (
    <ErrorBoundary label="Money">
      <div style={{ padding: '4px 0' }}>
        <div className="skeleton-shimmer" style={{ height: 100, borderRadius: 16, marginBottom: 16 }} />
        <div className="skeleton-shimmer" style={{ width: '30%', height: 14, borderRadius: 6, marginBottom: 12 }} />
        {[0,1,2].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 72, borderRadius: 12, marginBottom: 8 }} />)}
      </div>
    </ErrorBoundary>
  );

  const filtPays = filter === "all" ? pays : pays.filter(p => (p.dependant_id || "self") === filter);
  const totalDue = filtPays.filter(p => !p.paid && p.status !== "not_renewing").reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalPaid = filtPays.filter(p => p.paid).reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  return (
    <ErrorBoundary label="Money">
      <div>
        {/* WEEK/MONTH HEADER */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 800, color: "var(--color-primary)" }}>This week</h2>
        </div>

        {/* HORIZONTAL DAY PILLS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
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
        </div>

        {/* DAY PANEL */}
        {selectedDay && (() => {
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
            <div style={{ padding: "8px 12px", maxHeight: 200, overflowY: "auto" }}>
              {dayEvts.length === 0 ? <div style={{ padding: "12px 0", textAlign: "center", color: "var(--color-muted)", fontSize: 13 }}>{isHol ? "School holiday \u2014 no activities scheduled" : "Nothing scheduled this day"}</div>
              : dayEvts.map((e, i) => <div key={e.id || i} style={{ display: "flex", alignItems: "stretch", gap: 0, borderRadius: 12, overflow: "hidden", background: "var(--bg)", border: "1px solid var(--color-border)", marginBottom: 6 }}>
                <div style={{ width: 4, background: getMemberCol(e.memberId, e.colour), flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{e.source_type === "camp" ? "\u{1F3D5}\uFE0F " : ""}{e.club || e.title || ""}</div>
                    <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>{e.member}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)", fontVariantNumeric: "tabular-nums" }}>{e.time || ""}{e.endTime ? "\u2013" + e.endTime : ""}</div>
                  </div>
                </div>
              </div>)}
            </div>
          </div>;
        })()}

        {/* Spend summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={{ background: "var(--color-card)", borderRadius: 14, padding: 12, border: "1px solid var(--color-border)", textAlign: "center", boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-primary)", fontFamily: "var(--font-serif)" }}>{"\u20AC"}{filtPays.reduce((s, p) => s + parseFloat(p.amount || 0), 0).toFixed(0)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted)", marginTop: 2 }}>Total tracked</div>
          </div>
          <div style={{ background: "var(--color-card)", borderRadius: 14, padding: 12, border: "1px solid var(--color-border)", textAlign: "center", boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a", fontFamily: "var(--font-serif)" }}>{"\u20AC"}{filtPays.filter(p => p.paid).reduce((s, p) => s + parseFloat(p.amount || 0), 0).toFixed(0)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted)", marginTop: 2 }}>Paid</div>
          </div>
          <div style={{ background: "var(--color-card)", borderRadius: 14, padding: 12, border: "1px solid var(--color-border)", textAlign: "center", boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent)", fontFamily: "var(--font-serif)" }}>{"\u20AC"}{filtPays.filter(p => !p.paid).reduce((s, p) => s + parseFloat(p.amount || 0), 0).toFixed(0)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted)", marginTop: 2 }}>Outstanding</div>
          </div>
        </div>

        {(() => {
          const overdue = filtPays.filter(p => !p.paid && new Date(p.due_date) < new Date());
          if (overdue.length === 0) return null;
          const total = overdue.reduce((s, p) => s + parseFloat(p.amount), 0);
          return <div style={{ background: "var(--color-danger-bg, #fef2f2)", border: "1px solid var(--color-danger-border, #fecaca)", borderRadius: 14, padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{"\u{1F6A8}"}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-danger)" }}>{"\u20AC"}{total.toFixed(0)} overdue</div>
              <div style={{ fontSize: 12, color: "var(--color-danger)" }}>{overdue.length} payment{overdue.length > 1 ? "s" : ""} past due date</div>
            </div>
          </div>;
        })()}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "var(--color-accent-bg)", borderRadius: 14, padding: 16, border: "1px solid #f0d078" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#c44030", fontFamily: "var(--font-serif)" }}>{"\u20AC"}{totalDue.toFixed(0)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#a68600", marginTop: 2 }}>Outstanding</div>
          </div>
          <div style={{ background: "var(--color-primary-bg)", borderRadius: 14, padding: 16, border: "1px solid #c8e6c9" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--color-primary)", fontFamily: "var(--font-serif)" }}>{"\u20AC"}{totalPaid.toFixed(0)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary-light)", marginTop: 2 }}>Paid</div>
          </div>
        </div>
        {filtPays.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-muted)" }}><div style={{ fontSize: 36, marginBottom: 8 }}>{"\u{1F4B3}"}</div><p style={{ fontSize: 14 }}>No payment reminders yet</p></div>
        : filtPays.map(p => {
          const overdue = !p.paid && new Date(p.due_date) < new Date();
          const kid = p.dependant_id ? kids.find(k => k.id === p.dependant_id) : null;
          const cl = clubs.find(c => c.club_id === p.club_id);
          return <div key={p.id} style={{ background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", boxShadow: "var(--shadow)", padding: 16, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>{kid?.first_name || profile?.first_name || "You"} {"\u2014"} {p.description}</div><div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>{cl?.club_name || ""} {"\u2022"} Due {new Date(p.due_date).toLocaleDateString("en-IE", { day: "numeric", month: "short" })}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 800, color: p.paid ? "var(--color-primary-light)" : p.status === "not_renewing" ? "var(--color-muted)" : overdue ? "var(--color-danger)" : "var(--color-text)", fontFamily: "var(--font-serif)", textDecoration: p.status === "not_renewing" ? "line-through" : "none" }}>{"\u20AC"}{parseFloat(p.amount).toFixed(0)}</div>
                {isAdmin && !p.paid && p.status !== "not_renewing" && <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "flex-end" }}>
                  <button onClick={async () => { try { await db("payment_reminders", "PATCH", { body: { paid: true }, filters: ["id=eq." + p.id] }); showToast("Marked as paid"); await load() } catch (e) { showToast("Failed to update. Try again.", "err") } }} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary-light)", background: "var(--color-primary-bg)", border: "none", borderRadius: 8, padding: "3px 10px", cursor: "pointer" }}>Paid</button>
                  <button onClick={async () => { try { await db("payment_reminders", "PATCH", { body: { status: "not_renewing" }, filters: ["id=eq." + p.id] }); await load() } catch (e) { showToast("Failed to update. Try again.", "err") } }} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", background: "var(--color-primary-bg)", border: "none", borderRadius: 8, padding: "3px 10px", cursor: "pointer" }}>Not renewing</button>
                </div>}
                {p.status === "not_renewing" && <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "flex-end", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 600 }}>Not renewing</span>
                  <button onClick={async () => { try { await db("payment_reminders", "DELETE", { filters: ["id=eq." + p.id] }); await load() } catch (e) { showToast("Failed to remove. Try again.", "err") } }} style={{ fontSize: 10, fontWeight: 600, color: "var(--color-danger)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Remove</button>
                </div>}
                {p.paid && <span style={{ fontSize: 11, color: "var(--color-primary-light)", fontWeight: 700 }}>{"\u2713"} Paid</span>}
              </div>
            </div>
          </div>
        })}
        {isAdmin && <button onClick={() => setShowAddPay(true)} style={{ width: "100%", padding: 14, borderRadius: 14, border: "2px dashed var(--color-border)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-muted)", fontFamily: "var(--font-sans)", marginTop: 8 }}>+ Add payment reminder</button>}

        {showAddPay && <AddPaymentModal clubs={clubs} userId={user.id} kids={kids} profile={profile} onClose={() => setShowAddPay(false)} onSaved={() => { setShowAddPay(false); window.__hapticSuccess && window.__hapticSuccess(); load() }} />}
      </div>
    </ErrorBoundary>
  );
}
