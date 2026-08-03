import { useState, useEffect, useMemo } from 'react';
import { COLS } from '../lib/constants';
import ICN from '../lib/icons';
import Logo from './Logo';
import { isToday } from '../lib/utils';

const overviewIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const settingsIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: overviewIcon },
  { id: "week", label: "Schedule", icon: ICN.calendar },
  { id: "money", label: "Money", icon: ICN.wallet },
  { id: "explore", label: "Explore", icon: ICN.search },
];

export default function DesktopSidebar({
  tab, onChangeTab, filter, setFilter, kids, members,
  weekEvts, darkMode, setDarkMode, setShowProfile,
  isAdmin, onShowFab,
}) {
  const nextUp = useMemo(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return (weekEvts || [])
      .filter(e => !e.skipped && isToday(e.date) && e.time)
      .filter(e => {
        const [h, m] = e.time.split(":").map(Number);
        return h * 60 + m > nowMins;
      })
      .sort((a, b) => a.time.localeCompare(b.time))[0] || null;
  }, [weekEvts]);

  const [minsLeft, setMinsLeft] = useState(() => {
    if (!nextUp?.time) return null;
    const now = new Date();
    const [h, m] = nextUp.time.split(":").map(Number);
    return Math.max(0, (h * 60 + m) - (now.getHours() * 60 + now.getMinutes()));
  });

  useEffect(() => {
    if (!nextUp?.time) return;
    const timer = setInterval(() => {
      const now = new Date();
      const [h, m] = nextUp.time.split(":").map(Number);
      setMinsLeft(Math.max(0, (h * 60 + m) - (now.getHours() * 60 + now.getMinutes())));
    }, 60000);
    return () => clearInterval(timer);
  }, [nextUp]);

  const visibleNavItems = isAdmin ? NAV_ITEMS : NAV_ITEMS.filter(n => n.id !== "money");

  return (
    <aside className="desktop-sidebar">
      <div style={{ marginBottom: 20 }}><Logo /></div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Filter</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {members.map(m => (
            <button key={m.id} onClick={() => setFilter(m.id)} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              border: filter === m.id ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
              background: filter === m.id ? "var(--color-primary-bg)" : "var(--color-card)",
              color: filter === m.id ? "var(--color-primary)" : "var(--color-text)",
              cursor: "pointer", fontFamily: "var(--font-sans)",
            }}>
              {m.type === "kid" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLS[members.indexOf(m) % COLS.length] }} />}
              {m.type === "all" ? "All" : m.name}
            </button>
          ))}
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 16 }}>
        {visibleNavItems.map(n => (
          <button key={n.id} className={"sidebar-nav-item" + (tab === n.id ? " sidebar-nav-item--active" : "")} onClick={() => onChangeTab(n.id)}>
            <span style={{ display: "flex", opacity: tab === n.id ? 1 : .6 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <button className="sidebar-nav-item" onClick={() => setShowProfile(true)} style={{ marginBottom: 16 }}>
        <span style={{ display: "flex", opacity: .6 }}>{settingsIcon}</span>
        Settings
      </button>

      {nextUp && (
        <div style={{ background: "var(--color-primary-bg)", borderRadius: 12, padding: 12, marginBottom: 16, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Next up</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: nextUp.colour || "var(--color-primary)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextUp.club || nextUp.title}</div>
              <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                {nextUp.time}{nextUp.member ? " \u00B7 " + nextUp.member : ""}
                {minsLeft != null && <span style={{ color: "var(--color-accent)", fontWeight: 700, marginLeft: 6 }}>in {minsLeft}m</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button onClick={onShowFab} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        width: "100%", padding: "10px 0", borderRadius: 10,
        background: "linear-gradient(135deg,var(--color-primary),var(--color-primary-light))",
        color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
        cursor: "pointer", fontFamily: "var(--font-sans)", marginBottom: 12,
      }}>+ Add</button>

      <button onClick={() => setDarkMode(!darkMode)} style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderRadius: 8, border: "none",
        background: "none", cursor: "pointer", fontFamily: "var(--font-sans)",
        fontSize: 12, fontWeight: 500, color: "var(--color-muted)", width: "100%",
      }}>{darkMode ? "\u2600\uFE0F" : "\uD83C\uDF19"} {darkMode ? "Light mode" : "Dark mode"}</button>
    </aside>
  );
}
