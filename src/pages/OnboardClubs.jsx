import React, { useState, useEffect, useRef } from 'react';
import { db, SB, SK, hd, getToken } from '../lib/supabase';
import { track, showToast, san } from '../lib/utils';
import { CT, CC } from '../lib/constants';
import Logo from '../components/Logo';

const COLS = ["#2d7cb5", "#2d5a3f", "#c4960c", "#9b4dca", "#d64545", "#1a8a7d", "#e67e22", "#e84393"];

export default function OnboardClubs({ userId, kids, email, onDone, onLogout }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  const [added, setAdded] = useState([]);
  const [sv, setSv] = useState(false);
  const [assign, setAssign] = useState(null);
  const [searching, setSearching] = useState(false);
  const tmr = useRef(null);

  function onType(v) {
    setQ(v);
    clearTimeout(tmr.current);
    if (v.length < 2) {
      setRes([]);
      return;
    }
    tmr.current = setTimeout(async () => {
      setSearching(true);
      const r = await db("clubs", "GET", {
        select: "id,name,address,location,rating",
        filters: ["name=ilike.*" + san(v) + "*"],
        limit: 8,
        order: "rating.desc.nullslast"
      });
      setRes(r || []);
      setSearching(false);
    }, 300);
  }

  async function pick(club) {
    if (kids.length === 0) {
      setSv(true);
      await db("hub_subscriptions", "POST", {
        body: {
          user_id: userId,
          club_id: club.id,
          colour: COLS[added.length % COLS.length]
        }
      });
      setAdded([...added, { ...club, who: "You" }]);
      setQ("");
      setRes([]);
      setSv(false);
    } else {
      setAssign(club);
      setQ("");
      setRes([]);
    }
  }

  async function doAssign(club, depId, who) {
    setSv(true);
    await db("hub_subscriptions", "POST", {
      body: {
        user_id: userId,
        club_id: club.id,
        dependant_id: depId || null,
        colour: COLS[added.length % COLS.length]
      }
    });
    setAdded([...added, { ...club, who }]);
    setAssign(null);
    setSv(false);
  }

  async function addNew() {
    if (!q.trim()) return;
    setSv(true);
    const sl = q.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Math.random().toString(36).substring(2, 6);
    const r = await db("clubs", "POST", {
      body: {
        name: q.trim(),
        slug: sl,
        source: "external"
      }
    });
    if (r && r[0]) {
      if (kids.length === 0) {
        await db("hub_subscriptions", "POST", {
          body: {
            user_id: userId,
            club_id: r[0].id,
            colour: COLS[added.length % COLS.length]
          }
        });
        setAdded([...added, { id: r[0].id, name: q.trim(), who: "You" }]);
      } else {
        setAssign({ id: r[0].id, name: q.trim() });
      }
    }
    setQ("");
    setRes([]);
    setSv(false);
  }

  async function finish() {
    track("onboard_complete");
    await db("profiles", "PATCH", {
      body: { onboarding_step: "done", onboarding_completed: true },
      filters: ["id=eq." + userId]
    });
    onDone();
  }

  // Trial subscription screen — shown after adding kids/clubs
  const [showTrial, setShowTrial] = useState(false);
  const [isEarlyAdopter, setIsEarlyAdopter] = useState(false);
  const [earlyNum, setEarlyNum] = useState(null);
  const [trialLoading, setTrialLoading] = useState(true);

  // Check early adopter status when trial screen shows
  useEffect(() => {
    if (showTrial) {
      setTrialLoading(true);
      db("profiles", "GET", {
        filters: ["id=eq." + userId],
        select: "is_early_adopter,early_adopter_number,subscription_status"
      }).then(r => {
        if (r && r[0] && (r[0].is_early_adopter || r[0].subscription_status === "active")) {
          setIsEarlyAdopter(true);
          setEarlyNum(r[0].early_adopter_number);
          track("early_adopter_shown");
        }
        setTrialLoading(false);
      }).catch(() => setTrialLoading(false));
    }
  }, [showTrial]);

  if (showTrial) {
    const _t = getToken();
    return (
      <div className="fi" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--warm)" }}>
        <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
          {trialLoading ? (
            <div>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
              <p style={{ fontSize: 15, color: "var(--mt)" }}>Setting up your account...</p>
            </div>
          ) : isEarlyAdopter ? (
            <>
              <div style={{ fontSize: 64, marginBottom: 8 }}>🎁</div>
              <div style={{
                background: "linear-gradient(135deg,#e85d4a,#c44030)",
                borderRadius: 14,
                padding: "6px 20px",
                display: "inline-block",
                marginBottom: 16
              }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>EARLY ADOPTER</span>
              </div>
              <h2 style={{ fontFamily: "var(--sr)", fontSize: 26, fontWeight: 800, color: "var(--g)", marginBottom: 8 }}>You're one of the first!</h2>
              <p style={{ fontSize: 15, color: "var(--mt)", marginBottom: 20, lineHeight: 1.6 }}>You're one of the very first people to use OneClubView. That makes you part of our founding crew — and your account is <strong style={{ color: "var(--g)" }}>free, forever</strong>. No trial. No card. No catch. Ever.</p>
              <div style={{
                background: "linear-gradient(135deg,#1a2a3a,#2d4a5f)",
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                color: "#fff",
                textAlign: "left"
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--acc)", marginBottom: 10 }}>Your free-for-life account includes everything:</div>
                {["Full family scheduling for both parents", "Fee tracking and reminders across all clubs", "Easter and summer camp finder near you", "Schedule clash detection", "All future features as we build them", "Priority support — we'll actually listen"].map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 7 }}>
                    <span style={{ color: "var(--acc)", fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 13 }}>{t}</span>
                  </div>
                ))}
              </div>
              <div style={{
                background: "#f0fdf4",
                borderRadius: 14,
                padding: 16,
                marginBottom: 20,
                textAlign: "left",
                border: "1px solid #bbf7d0"
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gl)", marginBottom: 4 }}>One thing we'd love from you</div>
                <p style={{ fontSize: 13, color: "var(--tx)", margin: 0, lineHeight: 1.5 }}>Tell us what works, what's broken, and what you wish it did. Your feedback shapes the product for every parent who comes after you. You can reach us anytime via the support button.</p>
              </div>
              <button
                onClick={finish}
                style={{
                  width: "100%",
                  padding: 16,
                  borderRadius: 14,
                  border: "none",
                  background: "var(--g)",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--sn)"
                }}>
                Let's go — it's all yours →
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontFamily: "var(--sr)", fontSize: 24, fontWeight: 800, color: "var(--g)", marginBottom: 8 }}>You're all set!</h2>
              <p style={{ fontSize: 15, color: "var(--mt)", marginBottom: 24, lineHeight: 1.6 }}>Your first 14 days are completely free.<br />After that, it's just €7.99/month to keep your family organised.</p>
              <div style={{
                background: "#fff",
                borderRadius: 16,
                border: "1px solid var(--bd)",
                padding: 20,
                marginBottom: 16,
                textAlign: "left"
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["See your whole family's week in one place", "Fee reminders across all clubs", "Easter & summer camp finder", "Clash detection & pickup planning", "Works for both parents"].map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: "var(--gl)", fontSize: 16 }}>✓</span>
                      <span style={{ fontSize: 13, color: "var(--tx)" }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    track("stripe_checkout_clicked");
                    await db("profiles", "PATCH", {
                      body: { onboarding_step: "done", onboarding_completed: true },
                      filters: ["id=eq." + userId]
                    });
                    const res = await fetch(SB + "/functions/v1/stripe-billing", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + _t
                      },
                      body: JSON.stringify({
                        action: "checkout",
                        user_id: userId,
                        email: email,
                        tier: "standard",
                        return_url: window.location.origin
                      })
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                    else {
                      onDone();
                    }
                  } catch (e) {
                    onDone();
                  }
                }}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 14,
                  border: "none",
                  background: "var(--g)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--sn)",
                  marginBottom: 10
                }}>
                Start free trial — add card
              </button>
              <button
                onClick={() => {
                  track("trial_skipped");
                  finish();
                }}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 14,
                  border: "none",
                  background: "none",
                  color: "var(--mt)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "var(--sn)"
                }}>
                Maybe later — skip for now
              </button>
              <p style={{ fontSize: 11, color: "var(--mt)", marginTop: 12 }}>Cancel anytime. No charge during your 14-day trial.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const initials = (n) => n.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

  return (
    <div className="fi" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--warm)" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
          <h2 style={{ fontFamily: "var(--sr)", fontSize: 24, fontWeight: 800, color: "var(--g)" }}>What clubs are you in?</h2>
          <p style={{ fontSize: 14, color: "var(--mt)", marginTop: 6 }}>Search for your club — we'll find it</p>
        </div>
        {added.length > 0 && (
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {added.map((c, i) => (
              <div key={c.id + "-" + i} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--gxl)",
                borderRadius: 14,
                padding: "10px 16px",
                border: "1px solid #c8e6c9"
              }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: COLS[i % COLS.length],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800
                }}>
                  {initials(c.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--g)" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--gl)" }}>{c.who}</div>
                </div>
                <span style={{ color: "var(--gl)" }}>✓</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ position: "relative" }}>
          <input
            value={q}
            onChange={e => onType(e.target.value)}
            placeholder="Type club name..."
          />
          {searching && <span style={{ position: "absolute", right: 14, top: 13, fontSize: 12, color: "var(--mt)" }}>...</span>}
        </div>
        {res.length > 0 && (
          <div style={{
            marginTop: 4,
            background: "var(--card)",
            border: "1px solid var(--bd)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,.08)"
          }}>
            {res.map(c => (
              <button
                key={c.id}
                onClick={() => pick(c)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "none",
                  borderBottom: "1px solid #f5f3ef",
                  background: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--sn)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10
                }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "var(--gxl)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "var(--g)",
                  flexShrink: 0
                }}>
                  {initials(c.name)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  {(c.address || c.location) && <div style={{ fontSize: 11, color: "var(--mt)" }}>{c.address || c.location}</div>}
                </div>
                {c.rating && <span style={{ marginLeft: "auto", fontSize: 11, color: "#e85d4a", fontWeight: 700 }}>★ {c.rating}</span>}
              </button>
            ))}
          </div>
        )}
        {q.length >= 2 && res.length === 0 && !searching && (
          <button
            onClick={addNew}
            style={{
              width: "100%",
              marginTop: 8,
              padding: 12,
              borderRadius: 12,
              border: "2px dashed var(--bd)",
              background: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--mt)",
              fontFamily: "var(--sn)"
            }}>
            + Add "{q}" as a new club
          </button>
        )}
        {assign && (
          <div className="mbg" onClick={e => e.target === e.currentTarget && setAssign(null)}>
            <div className="mbox" style={{ textAlign: "center", padding: 32 }}>
              <h3 style={{ fontFamily: "var(--sr)", fontSize: 18, fontWeight: 700, color: "var(--g)", marginBottom: 4 }}>Who goes to {assign.name}?</h3>
              <p style={{ fontSize: 13, color: "var(--mt)", marginBottom: 20 }}>Tap each family member who attends</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => doAssign(assign, null, "You")}
                  className="btn bs"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  👤 Me
                </button>
                {kids.map(k => (
                  <button
                    key={k.id}
                    onClick={() => doAssign(assign, k.id, k.first_name)}
                    className="btn bs"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    👧 {k.first_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => {
            setShowTrial(true);
            track("trial_screen_shown");
          }}
          className={"btn " + (added.length ? "bp" : "bs")}
          style={{ marginTop: 24 }}>
          {added.length ? "Continue →" : "Skip"}
        </button>
      </div>
    </div>
  );
}
