import React, { useMemo } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import { COLS } from '../../lib/constants';
import { getAge, isToday, calcKm, fmtDate } from '../../lib/utils';

export default function OverviewTab({ filter, onChangeTab, onRefresh }) {
  const {
    kids, clubs, recs, mans, pays, camps, campBookings,
    holidays, userHolidays, familyMembers,
    isAdmin, members, wd, clubMap, clubTermMap, kidMap,
    getMemberCol, user, profile, load,
    userLoc, familyLocs, schoolLocs, weekEvts,
  } = useHubData();

  const activeWeekEvts = weekEvts.filter(e => !e.skipped);
  const filtPays = filter === "all" ? pays : pays.filter(p => (p.dependant_id || "self") === filter);
  const totalDue = filtPays.filter(p => !p.paid && p.status !== "not_renewing").reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  // Build all active location points
  const allLocs = useMemo(() => {
    const locs = [];
    if (userLoc) locs.push({ ...userLoc, radius: 15, label: "\u{1F4CD} Current" });
    familyLocs.forEach(fl => locs.push({ lat: Number(fl.latitude), lng: Number(fl.longitude), radius: fl.radius_km || 15, label: fl.label }));
    if (familyLocs.length === 0) schoolLocs.forEach(s => locs.push({ ...s, radius: 10, label: "\u{1F3EB} " + s.name }));
    return locs;
  }, [userLoc, familyLocs, schoolLocs]);

  return (
    <ErrorBoundary label="Overview">
      <div>
      {/* SMART ALERTS */}
      {(() => {
        const alerts = [];
        const now = new Date();

        // Fee alerts (admin only)
        if (isAdmin) { pays.filter(p => !p.paid && p.status !== "not_renewing").forEach(p => {
          const due = new Date(p.due_date);
          const days = Math.ceil((due - now) / (86400000));
          if (days < 0) alerts.push({ type: "urgent", icon: "\u{1F6A8}", text: p.description + " is \u20AC" + parseFloat(p.amount).toFixed(0) + " overdue (" + Math.abs(days) + " days)", action: "money" });
          else if (days <= 3) alerts.push({ type: "warn", icon: "\u{1F4B3}", text: p.description + " \u2014 \u20AC" + parseFloat(p.amount).toFixed(0) + " due in " + days + " day" + (days !== 1 ? "s" : ""), action: "money" });
        }); }

        // Uncovered holiday weeks
        if (camps && camps.length > 0 && kids.length > 0) {
          const nextHol = (holidays || []).find(h => new Date(h.end_date) >= now);
          if (nextHol) {
            kids.forEach(kid => {
              const age = getAge(kid.date_of_birth);
              const holStart = new Date(nextHol.start_date + "T00:00:00"), holEnd = new Date(nextHol.end_date + "T23:59:59");
              const suitableCamps = (camps || []).filter(ca => {
                if (ca.age_min && age < ca.age_min) return false;
                if (ca.age_max && age > ca.age_max) return false;
                const cs = new Date(ca.start_date + "T00:00:00");
                if (cs < holStart || cs > holEnd) return false;
                if (allLocs.length > 0 && ca.latitude) {
                  const cLat = Number(ca.latitude), cLng = Number(ca.longitude);
                  const nearAny = allLocs.some(loc => calcKm(loc.lat, loc.lng, cLat, cLng) <= loc.radius);
                  if (!nearAny) return false;
                }
                return true;
              });
              const booked = (campBookings || []).filter(b => {
                if (b.dependant_id !== kid.id) return false;
                const camp = (camps || []).find(c => c.id === b.camp_id);
                if (!camp) return false;
                const cs = new Date(camp.start_date + "T00:00:00");
                return cs >= holStart && cs <= holEnd;
              });
              if (suitableCamps.length > 0 && booked.length === 0) {
                alerts.push({ type: "info", icon: "\u{1F3D5}\uFE0F", text: kid.first_name + " has no camp booked for " + nextHol.name + ". " + suitableCamps.length + " camp" + (suitableCamps.length > 1 ? "s" : "") + " suit" + (suitableCamps.length === 1 ? "s" : "") + " their age.", action: "explore", subaction: "camps" });
              }
            });
          }
        }

        // Clash today
        const todayEvts = activeWeekEvts.filter(e => isToday(e.date) && e.time);
        for (let i = 0; i < todayEvts.length; i++) {
          for (let j = i + 1; j < todayEvts.length; j++) {
            const a = todayEvts[i], b = todayEvts[j];
            if (a.memberId === b.memberId) continue;
            if ((a.time < (b.endTime || "23:59")) && (b.time < (a.endTime || "23:59"))) {
              alerts.push({ type: "urgent", icon: "\u26A0\uFE0F", text: "Clash today: " + a.member + " (" + a.title + " " + a.time + ") overlaps " + b.member + " (" + b.title + " " + b.time + ")", action: "week", day: new Date() });
            }
          }
        }

        // No driver assigned for today's events
        todayEvts.filter(e => !e.driver).forEach(e => {
          alerts.push({ type: "info", icon: "", text: "No driver set for " + e.member + "'s " + e.title + " at " + e.time, action: "week" });
        });

        // Events with no end time
        const noEnd = weekEvts.filter(e => e.time && !e.endTime);
        if (noEnd.length > 0) {
          alerts.push({ type: "info", icon: "\u23F0", text: noEnd.length + " event" + (noEnd.length > 1 ? "s" : "") + " this week with no end time \u2014 makes pickup planning harder", action: "week" });
        }

        // Camp recommendations from carers
        if (isAdmin && campBookings) {
          const recs2 = (campBookings || []).filter(b => b.status === "recommended");
          recs2.forEach(b => {
            const camp = (camps || []).find(c => c.id === b.camp_id);
            if (camp) alerts.push({ type: "info", icon: "\u{1F4A1}", text: "A carer recommended " + camp.title + " \u2014 tap to review", action: "explore", subaction: "camps" });
          });
        }

        if (alerts.length === 0) return null;

        const colors = { urgent: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" }, warn: { bg: "var(--color-accent-bg)", border: "#f8c4bc", text: "var(--color-accent)" }, info: { bg: "var(--color-primary-bg)", border: "#c8dce8", text: "var(--color-primary-light)" } };
        return <div style={{ marginBottom: 14 }}>
          {alerts.slice(0, 5).map((a, i) => {
            const col = colors[a.type] || colors.info;
            return <div key={i} onClick={() => { if (a.action) { onChangeTab(a.action, a.subaction); if (a.day) { /* day selection handled by parent */ } window.scrollTo(0, 0) } }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: col.bg, border: "1px solid " + col.border, marginBottom: 6, cursor: a.action ? "pointer" : "default" }} onTouchStart={ev => { if (a.action) ev.currentTarget.style.opacity = ".7" }} onTouchEnd={ev => { ev.currentTarget.style.opacity = "1" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
              <span style={{ flex: 1, fontSize: 12, color: col.text, fontWeight: 600, lineHeight: 1.4 }}>{a.text}</span>
              {a.action && <span style={{ flexShrink: 0, color: col.text, opacity: .5, fontSize: 14 }}>{"\u203A"}</span>}
            </div>;
          })}
        </div>;
      })()}
        {/* CLASH DETECTION */}
        {(() => {
          const clashes = [];
          wd.forEach(d => {
            const dayEvts = activeWeekEvts.filter(e => e.date.getFullYear() === d.getFullYear() && e.date.getMonth() === d.getMonth() && e.date.getDate() === d.getDate() && e.time);
            for (let i = 0; i < dayEvts.length; i++) {
              for (let j = i + 1; j < dayEvts.length; j++) {
                const a = dayEvts[i], b = dayEvts[j];
                if (a.memberId === b.memberId) continue;
                const aStart = a.time, aEnd = a.endTime || "23:59", bStart = b.time, bEnd = b.endTime || "23:59";
                if (aStart < bEnd && bStart < aEnd) clashes.push({ day: d, a, b });
              }
            }
          });
          if (clashes.length === 0) return null;
          return <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 16, padding: 14, marginBottom: 14, boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>{"\u26A0\uFE0F"} {clashes.length} clash{clashes.length > 1 ? "es" : ""} this week</div>
            {clashes.map((cl, i) => <div key={i} onClick={() => { onChangeTab("week"); window.scrollTo(0, 0) }} style={{ fontSize: 12, color: "#991b1b", marginBottom: 2, cursor: "pointer", padding: "4px 0", borderRadius: 6 }}>
              {fmtDate(cl.day)}: {cl.a.member} ({cl.a.title} {cl.a.time}) overlaps {cl.b.member} ({cl.b.title} {cl.b.time}) {"\u2192"}
            </div>)}
          </div>;
        })()}

        {/* THIS WEEK STATS */}
        <div className="stagger-card" style={{ animationDelay: "0ms", background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 700, color: "var(--color-primary)", marginBottom: 10 }}>This week</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div onClick={() => { onChangeTab("week"); window.scrollTo(0, 0) }} style={{ background: "var(--color-primary-bg)", borderRadius: 12, padding: 12, textAlign: "center", cursor: "pointer", transition: "transform .1s" }} onTouchStart={ev => ev.currentTarget.style.transform = "scale(.95)"} onTouchEnd={ev => ev.currentTarget.style.transform = ""}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: "var(--color-primary)" }}>{activeWeekEvts.length}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted)", marginTop: 2 }}>Activities {"\u203A"}</div>
            </div>
            <div onClick={() => { onChangeTab("explore", "clubs"); window.scrollTo(0, 0) }} style={{ background: "var(--color-primary-bg)", borderRadius: 12, padding: 12, textAlign: "center", cursor: "pointer", transition: "transform .1s" }} onTouchStart={ev => ev.currentTarget.style.transform = "scale(.95)"} onTouchEnd={ev => ev.currentTarget.style.transform = ""}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: "var(--color-primary)" }}>{new Set(activeWeekEvts.map(e => e.club).filter(Boolean)).size}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted)", marginTop: 2 }}>Clubs {"\u203A"}</div>
            </div>
            {isAdmin && <div onClick={() => { onChangeTab("money"); window.scrollTo(0, 0) }} style={{ background: "var(--color-primary-bg)", borderRadius: 12, padding: 12, textAlign: "center", cursor: "pointer", transition: "transform .1s" }} onTouchStart={ev => ev.currentTarget.style.transform = "scale(.95)"} onTouchEnd={ev => ev.currentTarget.style.transform = ""}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: totalDue > 0 ? "var(--color-accent)" : "var(--color-primary)" }}>{"\u20AC"}{totalDue.toFixed(0)}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted)", marginTop: 2 }}>Due soon {"\u203A"}</div>
            </div>}
            <div onClick={() => { const el = document.getElementById("family-section"); if (el) el.scrollIntoView({ behavior: "smooth" }) }} style={{ background: "var(--color-primary-bg)", borderRadius: 12, padding: 12, textAlign: "center", cursor: "pointer", transition: "transform .1s" }} onTouchStart={ev => ev.currentTarget.style.transform = "scale(.95)"} onTouchEnd={ev => ev.currentTarget.style.transform = ""}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: "var(--color-primary)" }}>{kids.length}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted)", marginTop: 2 }}>Kids {"\u203A"}</div>
            </div>
          </div>
        </div>

        {/* FAMILY SUMMARY */}
        <div id="family-section" className="stagger-card" style={{ animationDelay: "60ms", background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 700, color: "var(--color-primary)", marginBottom: 10 }}>Family</h3>
          {kids.map((k, ki) => {
            const kidEvts = activeWeekEvts.filter(e => e.memberId === k.id);
            const kidClubs = [...new Set(kidEvts.map(e => e.club).filter(Boolean))];
            return <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: ki < kids.length - 1 ? "1px solid var(--color-border)" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: COLS[ki % COLS.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>{k.first_name?.[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{k.first_name}{getAge(k.date_of_birth) != null && <span style={{ color: "var(--color-muted)", fontWeight: 400, fontSize: 11, marginLeft: 4 }}>({getAge(k.date_of_birth)})</span>}</div>
                <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{kidEvts.length} activit{kidEvts.length === 1 ? "y" : "ies"}{kidClubs.length > 0 ? " \u00B7 " + kidClubs.join(", ") : ""}</div>
              </div>
            </div>;
          })}
          {/* Self */}
          {(() => {
            const selfEvts = activeWeekEvts.filter(e => e.memberId === "self");
            return selfEvts.length > 0 ? <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>{(profile?.first_name || "M")[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{profile?.first_name || "Me"}</div>
                <div style={{ fontSize: 11, color: "var(--color-muted)" }}>Driving: {activeWeekEvts.filter(e => e.driver === profile?.first_name).length} pickups this week</div>
              </div>
            </div> : null;
          })()}
        </div>

        {/* SPEND SNAPSHOT (admin only) */}
        {isAdmin && pays.length > 0 && <div className="stagger-card" style={{ animationDelay: "120ms", background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 700, color: "var(--color-primary)", marginBottom: 10 }}>Spend</h3>
          {(() => {
            const clubFees = {};
            pays.forEach(p => {
              const key = p.description || "Other";
              if (!clubFees[key]) clubFees[key] = { total: 0, paid: 0 };
              clubFees[key].total += parseFloat(p.amount || 0);
              if (p.paid) clubFees[key].paid += parseFloat(p.amount || 0);
            });
            const maxTotal = Math.max(...Object.values(clubFees).map(f => f.total), 1);
            return Object.entries(clubFees).slice(0, 4).map(([name, f]) => <div key={name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{name}</span>
                <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>{"\u20AC"}{f.total.toFixed(0)}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--color-primary-bg)", margin: "2px 0 6px", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, width: (f.total / maxTotal * 100) + "%", background: f.paid >= f.total ? "linear-gradient(90deg,#22c55e,#16a34a)" : "linear-gradient(90deg,var(--color-accent),#c44030)" }} />
              </div>
            </div>);
          })()}
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <span onClick={() => onChangeTab("money")} style={{ fontSize: 11, fontWeight: 600, color: "var(--color-accent)", cursor: "pointer" }}>View all fees {"\u203A"}</span>
          </div>
        </div>}

        {/* MY CLUBS */}
        {clubs.length > 0 && <div className="stagger-card" style={{ animationDelay: "180ms", background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 700, color: "var(--color-primary)", marginBottom: 10 }}>My Clubs</h3>
          {(() => {
            const grouped = {};
            clubs.forEach((c, i) => {
              if (!grouped[c.club_id]) grouped[c.club_id] = { ...c, members: [], idx: i, nickname: c.nickname || null };
              const kid = c.dependant_id ? kids.find(k => k.id === c.dependant_id) : null;
              grouped[c.club_id].members.push(kid ? kid.first_name : (profile?.first_name || "You"));
            });
            return Object.values(grouped).map((c, i) => {
              const term = clubTermMap.get(c.club_id);
              const termLabel = term ? new Date(c.term_start).toLocaleDateString("en-IE", { day: "numeric", month: "short" }) + " \u2013 " + new Date(c.term_end).toLocaleDateString("en-IE", { day: "numeric", month: "short" }) : "";
              return <div key={c.club_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < Object.keys(grouped).length - 1 ? "1px solid var(--color-border)" : "none", cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: c.colour || COLS[i % COLS.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{c.club_name.split(" ").map(w => w[0]).join("").substring(0, 2)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{c.nickname || c.club_name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{c.members.join(", ")}{termLabel ? " \u00B7 " + termLabel : ""}</div>
                </div>
                <span style={{ color: "#ddd", flexShrink: 0, fontSize: 14 }}>{"\u203A"}</span>
              </div>;
            });
          })()}
          {isAdmin && <div style={{ textAlign: "center", marginTop: 8 }}>
            <span onClick={() => onRefresh("clubs")} style={{ fontSize: 11, fontWeight: 600, color: "var(--color-accent)", cursor: "pointer" }}>+ Add a club</span>
          </div>}
        </div>}
      </div>
    </ErrorBoundary>
  );
}
