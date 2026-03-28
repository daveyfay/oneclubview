import React, { useState, useEffect, useRef } from 'react';
import { db, SB, getToken } from '../lib/supabase';
import { track, showToast } from '../lib/utils';
import { COLS } from '../lib/constants';
import ICN from '../lib/icons';
import Logo from '../components/Logo';
import CancelFeedback from '../components/CancelFeedback';
import AddEventModal from '../components/modals/AddEventModal';
import AddPaymentModal from '../components/modals/AddPaymentModal';
import AddKidModal from '../components/modals/AddKidModal';
import PasteScheduleModal from '../components/modals/PasteScheduleModal';
import AddActivityModal from '../components/modals/AddActivityModal';
import AddPlaydateModal from '../components/modals/AddPlaydateModal';
import { HubDataProvider } from '../contexts/HubDataContext';
import { useHubData } from '../hooks/useHubData';
import OverviewTab from './tabs/OverviewTab';
import ScheduleTab from './tabs/ScheduleTab';
import MoneyTab from './tabs/MoneyTab';
import ExploreTab from './tabs/ExploreTab';
import SettingsTab from './tabs/SettingsTab';

export default function Hub({ user, profile, onRefresh, onLogout }) {
  return (
    <HubDataProvider user={user} profile={profile}>
      <HubInner user={user} profile={profile} onRefresh={onRefresh} onLogout={onLogout} />
    </HubDataProvider>
  );
}

function HubInner({ user, profile, onRefresh, onLogout }) {
  const {
    kids, clubs, pays, loading, isAdmin, members,
    familyMembers, notifications, load, userLoc,
  } = useHubData();

  const [tab, setTab] = useState("overview");
  const [filter, setFilter] = useState("all");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ocv-dark") === "1");
  const [showFab, setShowFab] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [exploreSubTab, setExploreSubTab] = useState(null);

  // FAB modal states (kept in shell since FAB is here)
  const [showAddEv, setShowAddEv] = useState(false);
  const [showAddPay, setShowAddPay] = useState(false);
  const [showAddKid, setShowAddKid] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddPlaydate, setShowAddPlaydate] = useState(false);

  // Pull-to-refresh
  const [ptrState, setPtrState] = useState("");
  const ptrStart = useRef(0);
  const ptrDist = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("ocv-dark", darkMode ? "1" : "0")
  }, [darkMode]);

  // Trial/subscription check
  const trialStart = profile?.trial_started_at ? new Date(profile.trial_started_at) : null;
  const trialDays = trialStart ? Math.floor((new Date() - trialStart) / (86400000)) : 0;
  const trialExpired = trialDays > 14;
  const needsPayment = (() => {
    if (profile?.is_beta) return false;
    if (profile?.subscription_status === "active") return false;
    if (!trialExpired) return false;
    const famHasActive = familyMembers.some(fm => fm.subscription_status === "active" || fm.is_beta);
    if (famHasActive) return false;
    return true;
  })();

  function shareWeek() {
    // Simple share — we don't need weekEvts here, just fire the action
    track("share_week");
    showToast("Use the Schedule tab to share your week");
  }

  async function startCheckout(tier) {
    const _t = getToken();
    const res = await fetch(SB + "/functions/v1/stripe-billing", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + _t },
      body: JSON.stringify({ action: "checkout", user_id: user.id, email: user.email, tier: tier || "standard", return_url: window.location.origin })
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else showToast("Could not start checkout. Please try again.", "err");
  }

  async function openPortal() {
    const _t = getToken();
    const res = await fetch(SB + "/functions/v1/stripe-billing", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + _t },
      body: JSON.stringify({ action: "portal", user_id: user.id, return_url: window.location.origin })
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  function handleChangeTab(newTab, subTab) {
    setTab(newTab);
    if (newTab === "explore" && subTab) setExploreSubTab(subTab);
    window.scrollTo(0, 0);
  }

  const overviewIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
  const allTabs = [{ id: "overview", l: "Overview", i: overviewIcon }, { id: "week", l: "Schedule", i: ICN.calendar }, { id: "money", l: "Money", i: ICN.wallet }, { id: "explore", l: "Explore", i: ICN.search }];
  const tabs = isAdmin ? allTabs : allTabs.filter(t => t.id !== "money");

  // Loading skeleton — only shown on first load (no data yet)
  if (loading && kids.length === 0 && clubs.length === 0) return <div style={{ minHeight: "100vh", background: "var(--color-warm)" }}>
    <div style={{ background: "var(--color-card)", borderBottom: "1px solid var(--color-border)", padding: "12px 20px 6px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="skeleton-shimmer" style={{ width: 120, height: 22, borderRadius: 8 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <div className="skeleton-shimmer" style={{ width: 20, height: 20, borderRadius: 6 }} />
          <div className="skeleton-shimmer" style={{ width: 30, height: 30, borderRadius: 10 }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, paddingBottom: 8 }}>
        {[80, 60, 55, 45].map((w, i) => <div key={i} className="skeleton-shimmer" style={{ width: w, height: 36, borderRadius: 100 }} />)}
      </div>
      <div style={{ display: "flex", gap: 0, marginTop: 4 }}>
        {["Overview", "Schedule", "Money", "Explore"].map((t, i) => <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0 6px" }}>
          <div className="skeleton-shimmer" style={{ width: 20, height: 20, borderRadius: 6 }} />
          <div className="skeleton-shimmer" style={{ width: 40, height: 10, borderRadius: 4 }} />
        </div>)}
      </div>
    </div>
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 20px" }}>
      <div style={{ background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", padding: 16, marginBottom: 12 }}>
        <div className="skeleton-shimmer" style={{ width: 80, height: 16, borderRadius: 6, marginBottom: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[0, 1, 2, 3].map(i => <div key={i} style={{ background: "var(--color-primary-bg)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div className="skeleton-shimmer" style={{ width: 36, height: 28, borderRadius: 6 }} />
            <div className="skeleton-shimmer" style={{ width: 50, height: 10, borderRadius: 4 }} />
          </div>)}
        </div>
      </div>
      <div style={{ background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", padding: 16, marginBottom: 12 }}>
        <div className="skeleton-shimmer" style={{ width: 60, height: 16, borderRadius: 6, marginBottom: 14 }} />
        {[0, 1, 2].map(i => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--color-border)" : "none" }}>
          <div className="skeleton-shimmer" style={{ width: 32, height: 32, borderRadius: 10 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-shimmer" style={{ width: 80 + i * 20, height: 13, borderRadius: 4, marginBottom: 6 }} />
            <div className="skeleton-shimmer" style={{ width: 120 + i * 10, height: 10, borderRadius: 4 }} />
          </div>
        </div>)}
      </div>
      <div style={{ background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", padding: 16, marginBottom: 12 }}>
        <div className="skeleton-shimmer" style={{ width: 70, height: 16, borderRadius: 6, marginBottom: 14 }} />
        {[0, 1].map(i => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 1 ? "1px solid var(--color-border)" : "none" }}>
          <div className="skeleton-shimmer" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-shimmer" style={{ width: 100 + i * 30, height: 13, borderRadius: 4, marginBottom: 6 }} />
            <div className="skeleton-shimmer" style={{ width: 140, height: 10, borderRadius: 4 }} />
          </div>
        </div>)}
      </div>
    </div>
  </div>;

  // Paywall
  if (!loading && needsPayment) return (
    <div className="anim-fade" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--color-warm)" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <Logo />
        {profile?.subscription_status === "churned" ? <>
          <div style={{ fontSize: 48, margin: "24px 0 12px" }}>{"\u{1F44B}"}</div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: "var(--color-primary)" }}>We miss you!</h2>
          <p style={{ fontSize: 14, color: "var(--color-muted)", margin: "8px 0 16px", lineHeight: 1.6 }}>Your subscription has ended but your data is safe. You can pick up right where you left off.</p>
        </> : <>
          <div style={{ fontSize: 48, margin: "24px 0 12px" }}>{"\u23F0"}</div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, color: "var(--color-primary)" }}>Your free trial has ended</h2>
          <p style={{ fontSize: 14, color: "var(--color-muted)", margin: "8px 0 4px" }}>You had {trialDays} days with OneClubView. Subscribe to keep your family's schedule, fees, and clubs all in one place.</p>
        </>}
        <div style={{ background: "var(--color-card)", borderRadius: 20, border: "1px solid var(--color-border)", padding: 24, margin: "20px 0", textAlign: "left" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div onClick={() => startCheckout("standard")} style={{ background: "var(--color-warm)", borderRadius: 16, padding: 16, border: "2px solid var(--color-border)", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", marginBottom: 4 }}>STANDARD</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 800, color: "var(--color-primary)" }}>{"\u20AC"}7.99<span style={{ fontSize: 11, color: "var(--color-muted)" }}>/mo</span></div>
              <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>2 adults {"\u00B7"} 3 kids</div>
            </div>
            <div onClick={() => startCheckout("family_plus")} style={{ background: "var(--color-primary)", borderRadius: 16, padding: 16, border: "2px solid var(--color-primary)", cursor: "pointer", textAlign: "center", color: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-accent)", marginBottom: 4 }}>FAMILY+</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 800 }}>{"\u20AC"}14.99<span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>/mo</span></div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 4 }}>4 adults {"\u00B7"} 6 kids</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {["Weekly schedule with clash detection", "Fee tracking & reminders", "Camp finder for your family", "Forward emails to auto-update", "Smart notifications for both parents"].map(f => <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text)" }}><span style={{ color: "#16a34a", fontWeight: 700 }}>{"\u2713"}</span>{f}</div>)}
          </div>
        </div>
        <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 8 }}>Cancel anytime. Secure payment via Stripe.</p>
        <CancelFeedback userId={user.id} email={user.email} status={profile?.subscription_status} trialDays={trialDays} />
        <button onClick={onLogout} style={{ marginTop: 16, background: "none", border: "none", fontSize: 13, color: "var(--color-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Log out</button>
      </div>
    </div>
  );

  const noClubsBanner = clubs.length === 0;

  function ptrTouchStart(e) { if (window.scrollY < 5) { ptrStart.current = e.touches[0].clientY; ptrDist.current = 0; } }
  function ptrTouchMove(e) { if (!ptrStart.current) return; const d = e.touches[0].clientY - ptrStart.current; if (d > 0 && window.scrollY < 5) { ptrDist.current = d; if (d > 60) setPtrState("ready"); else if (d > 10) setPtrState("pulling"); } }
  function ptrTouchEnd() { if (ptrState === "ready") { setPtrState("refreshing"); window.__hapticSuccess && window.__hapticSuccess(); load().finally(() => { setPtrState(""); ptrStart.current = 0; }); } else { setPtrState(""); ptrStart.current = 0; } }

  return (
    <div className="anim-fade" style={{ background: "var(--color-warm)", minHeight: "100vh" }} onTouchStart={ptrTouchStart} onTouchMove={ptrTouchMove} onTouchEnd={ptrTouchEnd}>
      {/* Pull-to-refresh indicator */}
      <div className={"ptr-indicator" + (ptrState === "ready" || ptrState === "refreshing" ? " visible" : "")}>
        {ptrState === "refreshing" ? "Refreshing\u2026" : "\u2193 Pull to refresh"}
      </div>
      {/* Header */}
      <div style={{ background: "var(--color-card)", borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "12px 20px 6px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Logo />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowNotifs(!showNotifs)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)" }}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
                {notifications.filter(n => !n.read_at).length > 0 && <div style={{ position: "absolute", top: -3, right: -5, width: 14, height: 14, borderRadius: "50%", background: "var(--color-accent)", color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{notifications.filter(n => !n.read_at).length}</div>}
              </div>
              <button onClick={() => setShowProfile(!showProfile)} style={{ width: 30, height: 30, borderRadius: 10, background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>{(profile?.first_name || "U")[0]}</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingBottom: 6 }}>
            {members.map(m => <button key={m.id} onClick={() => setFilter(m.id)} className={"pill " + (filter === m.id ? "pill-active" : "pill-inactive")} style={{ flexShrink: 0 }}>{m.type !== "all" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.type === "kid" ? COLS[members.indexOf(m) % COLS.length] : m.type === "adult" ? "#8b5cf6" : "var(--color-primary)", flexShrink: 0 }} />}{m.type === "all" ? "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}" : ""} {m.name}{m.age != null && <span style={{ opacity: .5, marginLeft: 2 }}>({m.age})</span>}</button>)}
          </div>
        </div>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "flex" }}>
          {tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); track("tab_view", { tab: t.id }); window.__haptic && window.__haptic() }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "8px 0 6px", fontSize: 10, fontWeight: 600, border: "none", borderBottom: tab === t.id ? "2.5px solid var(--color-primary)" : "2.5px solid transparent", cursor: "pointer", background: "none", color: tab === t.id ? "var(--color-primary)" : "var(--color-muted)", fontFamily: "var(--font-sans)", transition: "color .15s" }}><span style={{ display: "flex" }}>{t.i}</span><span>{t.l}</span></button>)}
        </div>
      </div>

      <div key={tab} className="tab-content" style={{ maxWidth: 520, margin: "0 auto", padding: "16px 20px", paddingBottom: 100 }}>

        {/* ONBOARDING NUDGE */}
        {clubs.length === 0 && kids.length === 0 && <div style={{ background: "var(--color-accent-bg)", border: "1px solid #f0d078", borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F44B}"}</div>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 700, color: "var(--color-primary)", marginBottom: 6 }}>Welcome! Let's get you set up</h3>
          <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 14 }}>Start by adding your kids, then search for their clubs.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={() => setShowAddKid(true)} className="btn btn-primary" style={{ fontSize: 13 }}>+ Add a child</button>
            <button onClick={() => onRefresh("clubs")} className="btn btn-secondary" style={{ fontSize: 13 }}>+ Add a club</button>
          </div>
        </div>}

        {/* OFFLINE BANNER */}
        {typeof navigator !== "undefined" && !navigator.onLine && <div style={{ background: "#fef3c7", borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#92400e" }}>{"\u{1F4E1}"} You're offline {"\u2014"} showing cached data</div>}

        {/* TRIAL BANNER */}
        {!needsPayment && !profile?.is_beta && trialStart && profile?.subscription_status !== "active" && <div style={{ background: "linear-gradient(135deg,#1a2a3a,#2d4a5f)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
          <div><span style={{ fontSize: 12, fontWeight: 700 }}>Free trial</span><span style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginLeft: 6 }}>{Math.max(0, 14 - trialDays)} days left</span></div>
          <button onClick={() => startCheckout("standard")} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "var(--color-accent)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Subscribe</button>
        </div>}

        {/* No clubs prompt */}
        {noClubsBanner && <div style={{ background: "var(--color-primary-bg)", border: "1.5px solid #c8dce8", borderRadius: 14, padding: 16, marginBottom: 14, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{"\u{1F3E0}"}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)", marginBottom: 4 }}>Add your first club</div>
          <p style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 10 }}>Add clubs to see schedules, fees, and nearby options</p>
          <button onClick={() => onRefresh("clubs")} className="btn btn-primary" style={{ padding: "10px 24px", fontSize: 13 }}>+ Add a club</button>
        </div>}

        {/* TAB CONTENT */}
        {tab === "overview" && <OverviewTab filter={filter} onChangeTab={handleChangeTab} onRefresh={onRefresh} />}
        {tab === "week" && <ScheduleTab filter={filter} />}
        {tab === "money" && <MoneyTab filter={filter} />}
        {tab === "explore" && <ExploreTab filter={filter} onRefresh={onRefresh} />}
      </div>

      {/* Notification Panel */}
      {showNotifs && <div onClick={() => setShowNotifs(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10,15,20,.3)", zIndex: 60 }} />}
      {showNotifs && <div style={{ position: "fixed", top: 52, right: 12, left: 12, zIndex: 61, background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", boxShadow: "0 8px 30px rgba(0,0,0,.12)", padding: 8, maxHeight: "60vh", overflowY: "auto", maxWidth: 400, marginLeft: "auto" }}>
        <div style={{ padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)" }}>Updates</span>
          {notifications.filter(n => !n.read_at).length > 0 && <button onClick={async (e) => { e.stopPropagation(); try { await Promise.all(notifications.filter(x => !x.read_at).map(n => db("inbound_messages", "PATCH", { body: { read_at: new Date().toISOString() }, filters: ["id=eq." + n.id] }))); load() } catch (err) { showToast("Failed to mark as read.", "err") } }} style={{ fontSize: 11, fontWeight: 600, color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", padding: "2px 6px" }}>Mark all read</button>}
        </div>
        {notifications.length === 0 ? <div style={{ padding: "16px 10px", textAlign: "center", color: "var(--color-muted)", fontSize: 13 }}>No updates yet. Forward a club email to see them here.</div>
        : notifications.slice(0, 8).map(n => <div key={n.id} style={{ padding: "10px", borderRadius: 10, marginBottom: 2, background: n.read_at ? "var(--color-card)" : "var(--color-primary-bg)", cursor: "pointer" }} onClick={async (e) => { e.stopPropagation(); if (!n.read_at) await db("inbound_messages", "PATCH", { body: { read_at: new Date().toISOString() }, filters: ["id=eq." + n.id] }); const actions = { fee_due: "money", cancellation: "week", schedule_update: "week", reminder: "week", term_dates: "explore", general: "week" }; const actTab = actions[n.parsed_action] || "week"; if (actTab === "explore") { setTab("explore"); } else { setTab(actTab); } setShowNotifs(false); window.scrollTo(0, 0); load() }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 12 }}>{n.parsed_action === "fee_due" ? "\u{1F4B3}" : n.parsed_action === "cancellation" ? "\u{1F6AB}" : n.parsed_action === "schedule_update" ? "\u{1F4C5}" : n.parsed_action === "reminder" ? "\u23F0" : "\u{1F4EC}"}{!n.read_at && <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--color-accent)", flexShrink: 0 }} />}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>{n.parsed_data?.summary || n.subject || "Club update"}</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--color-muted)" }}>{new Date(n.created_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
        </div>)}
      </div>}

      {/* Profile/Settings Menu */}
      {showProfile && <SettingsTab onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} onClose={() => setShowProfile(false)} startCheckout={startCheckout} openPortal={openPortal} />}

      {/* FAB + Bottom Sheet */}
      {showFab && <div onClick={() => setShowFab(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10,15,20,.35)", zIndex: 70, transition: "opacity .2s" }} />}
      {showFab && <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 71, background: "var(--color-card)", borderRadius: "20px 20px 0 0", padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))", maxHeight: "75vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,.15)", animation: "slideUp .25s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 800, color: "var(--color-primary)" }}>Add to schedule</h3>
          <button onClick={() => setShowFab(false)} style={{ background: "none", border: "none", fontSize: 22, color: "var(--color-muted)", cursor: "pointer", padding: "4px" }}>{"\u00D7"}</button>
        </div>
        {isAdmin && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div onClick={() => { setShowFab(false); setShowAddEv(true) }} style={{ padding: "14px 8px", borderRadius: 14, border: "2px solid var(--color-border)", background: "var(--color-card)", cursor: "pointer", textAlign: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.background = "var(--color-primary-bg)" }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.background = "var(--color-card)" }}>
            <span style={{ fontSize: 22, display: "block", marginBottom: 4 }}>{"\u{1F4C5}"}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", display: "block" }}>Event</span>
            <span style={{ fontSize: 9, fontWeight: 500, color: "var(--color-muted)", display: "block", marginTop: 2 }}>Session or match</span>
          </div>
          <div onClick={() => { setShowFab(false); onRefresh("clubs") }} style={{ padding: "14px 8px", borderRadius: 14, border: "2px solid var(--color-border)", background: "var(--color-card)", cursor: "pointer", textAlign: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.background = "var(--color-primary-bg)" }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.background = "var(--color-card)" }}>
            <span style={{ fontSize: 22, display: "block", marginBottom: 4 }}>{"\u{1F3E0}"}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", display: "block" }}>Club</span>
            <span style={{ fontSize: 9, fontWeight: 500, color: "var(--color-muted)", display: "block", marginTop: 2 }}>Regular activity</span>
          </div>
          <div onClick={() => { setShowFab(false); setShowAddPlaydate(true) }} style={{ padding: "14px 8px", borderRadius: 14, border: "2px solid var(--color-border)", background: "var(--color-card)", cursor: "pointer", textAlign: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.background = "var(--color-primary-bg)" }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.background = "var(--color-card)" }}>
            <span style={{ fontSize: 22, display: "block", marginBottom: 4 }}>{"\u{1F91D}"}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", display: "block" }}>Playdate</span>
            <span style={{ fontSize: 9, fontWeight: 500, color: "var(--color-muted)", display: "block", marginTop: 2 }}>One-off meetup</span>
          </div>
          <div onClick={() => { setShowFab(false); setShowAddActivity(true) }} style={{ padding: "14px 8px", borderRadius: 14, border: "2px solid var(--color-border)", background: "var(--color-card)", cursor: "pointer", textAlign: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.background = "var(--color-primary-bg)" }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.background = "var(--color-card)" }}>
            <span style={{ fontSize: 22, display: "block", marginBottom: 4 }}>{"\u{1F389}"}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", display: "block" }}>Fun stuff</span>
            <span style={{ fontSize: 9, fontWeight: 500, color: "var(--color-muted)", display: "block", marginTop: 2 }}>From Discover</span>
          </div>
        </div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            ...(isAdmin ? [
              { icon: "\u{1F4CB}", label: "Paste schedule", desc: "From email or WhatsApp", fn: () => { setShowFab(false); setShowPaste(true) } },
              { icon: "\u{1F464}", label: "Add family member", desc: "Kid or adult", fn: () => { setShowFab(false); setShowAddKid(true) } },
              { icon: "\u{1F4B3}", label: "Add fee reminder", desc: "Track a payment", fn: () => { setShowFab(false); setShowAddPay(true) } },
            ] : []),
            { icon: "\u{1F4E4}", label: "Share my week", desc: "Send to partner or group", fn: () => { setShowFab(false); shareWeek() } },
          ].map(a => <button key={a.label} onClick={a.fn} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "none", background: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left", width: "100%" }} onTouchStart={e => e.currentTarget.style.background = "var(--color-primary-bg)"} onTouchEnd={e => e.currentTarget.style.background = "none"}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>{a.label}</div><div style={{ fontSize: 10, color: "var(--color-muted)" }}>{a.desc}</div></div>
          </button>)}
        </div>
      </div>}
      <button onClick={() => { setShowFab(!showFab); window.__hapticMedium && window.__hapticMedium() }} className="fab-btn" style={{ position: "fixed", bottom: "calc(20px + env(safe-area-inset-bottom, 0px))", right: 20, width: 56, height: 56, borderRadius: "50%", background: showFab ? "var(--color-muted)" : "linear-gradient(135deg,var(--color-primary),var(--color-primary-light))", color: "#fff", border: "none", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(26,42,58,.3)", zIndex: 72, transition: "transform .2s cubic-bezier(.4,0,.2,1),background .15s", transform: showFab ? "rotate(45deg) scale(.9)" : "none" }}>+</button>

      {/* FAB Modals */}
      {showAddEv && <AddEventModal clubs={clubs} userId={user.id} kids={kids} profile={profile} onClose={() => setShowAddEv(false)} onSaved={() => { setShowAddEv(false); window.__hapticSuccess && window.__hapticSuccess(); load() }} />}
      {showAddPay && <AddPaymentModal clubs={clubs} userId={user.id} kids={kids} profile={profile} onClose={() => setShowAddPay(false)} onSaved={() => { setShowAddPay(false); window.__hapticSuccess && window.__hapticSuccess(); load() }} />}
      {showAddActivity && <AddActivityModal userId={user.id} userLoc={userLoc} profile={profile} kids={kids} onClose={() => setShowAddActivity(false)} onSaved={() => { track("add_activity"); setShowAddActivity(false); window.__hapticSuccess && window.__hapticSuccess(); load() }} />}
      {showAddPlaydate && <AddPlaydateModal userId={user.id} profile={profile} kids={kids} onClose={() => setShowAddPlaydate(false)} onSaved={() => { track("add_playdate"); setShowAddPlaydate(false); window.__hapticSuccess && window.__hapticSuccess(); load() }} />}
      {showPaste && <PasteScheduleModal userId={user.id} clubs={clubs} kids={kids} profile={profile} onClose={() => setShowPaste(false)} onSaved={() => { setShowPaste(false); load() }} />}
      {showAddKid && <AddKidModal userId={user.id} editKid={typeof showAddKid === "object" ? showAddKid : null} profile={profile} onClose={() => setShowAddKid(false)} onSaved={() => { track("add_kid"); setShowAddKid(false); load() }} />}
    </div>
  );
}
