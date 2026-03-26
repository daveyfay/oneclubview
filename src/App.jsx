import React, { useState, useEffect } from 'react';
import { au, db, SB, SK, setTokens, restoreTokens, clearTokens, getToken, getRefreshToken } from './lib/supabase';
import { track, showToast } from './lib/utils';
import Logo from './components/Logo';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import OnboardKids from './pages/OnboardKids';
import OnboardClubs from './pages/OnboardClubs';
import Hub from './pages/Hub';
// import AdminDashboard from './pages/AdminDashboard'; // TODO: extract

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [kids, setKids] = useState([]);

  useEffect(() => {
    // Handle password recovery redirect from email link
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const accessToken = params.get("access_token");
      if (accessToken) {
        const rt = params.get("refresh_token");
        setTokens(accessToken, rt);
        window.history.replaceState({}, "", window.location.pathname);
        setTimeout(() => {
          const np = prompt("Enter your new password (min 8 characters):");
          if (np && np.length >= 8) {
            fetch(SB + "/auth/v1/user", {
              method: "PUT",
              headers: { apikey: SK, Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
              body: JSON.stringify({ password: np }),
            }).then(r => {
              if (r.ok) { showToast("Password changed!"); window.location.reload(); }
              else showToast("Error changing password.", "err");
            }).catch(() => showToast("Something went wrong.", "err"));
          } else if (np) {
            showToast("Password must be at least 8 characters.", "err");
          } else {
            window.location.reload();
          }
        }, 300);
        return;
      }
    }

    restoreTokens();
    const t = getToken();
    const urlParams = new URLSearchParams(window.location.search);
    const justSubscribed = urlParams.get("subscribed") === "true";
    if (justSubscribed) window.history.replaceState({}, "", window.location.pathname);

    if (t) {
      au("user").then(async u => {
        const p = await db("profiles", "GET", { filters: ["id=eq." + u.id] });
        let pr = p && p[0] ? p[0] : null;
        // If returning from Stripe checkout, mark onboarding complete
        if (justSubscribed && pr && !pr.onboarding_completed) {
          await db("profiles", "PATCH", { filters: ["id=eq." + u.id], body: { onboarding_completed: true, onboarding_step: "done", subscription_status: "active" } });
          pr = { ...pr, onboarding_completed: true, subscription_status: "active" };
        }
        setUser(u);
        setProfile(pr);
        if (pr && pr.onboarding_completed) setScreen("hub");
        else { setScreen("onboard_kids"); track("onboard_kids_shown"); }
      }).catch(() => {
        clearTokens();
        setScreen("landing");
      });
    } else {
      setScreen("landing");
    }
  }, []);

  async function onAuth(u) {
    setUser(u);
    const p = await db("profiles", "GET", { filters: ["id=eq." + u.id] });
    let pr = p && p[0] ? p[0] : null;
    // Check for pending invite and apply role+family
    if (pr && !pr.family_id) {
      const inv = await db("family_invites", "GET", { filters: ["invited_email=eq." + (pr.email || u.email).toLowerCase(), "accepted_at=is.null"], limit: 1 });
      if (inv && inv[0]) {
        await db("profiles", "PATCH", { filters: ["id=eq." + u.id], body: { family_role: inv[0].role || "admin", family_id: inv[0].family_id } });
        await db("family_invites", "PATCH", { filters: ["id=eq." + inv[0].id], body: { accepted_at: new Date().toISOString(), accepted_user_id: u.id } });
        const p2 = await db("profiles", "GET", { filters: ["id=eq." + u.id] });
        pr = p2 && p2[0] ? p2[0] : pr;
      }
    }
    setProfile(pr);
    if (pr && pr.onboarding_completed) setScreen("hub");
    else { setScreen("onboard_kids"); track("onboard_kids_shown"); }
  }

  async function afterKids() {
    const k = await db("dependants", "GET", { filters: ["parent_user_id=eq." + user.id] });
    setKids(k || []);
    setScreen("onboard_clubs");
    track("onboard_clubs_shown");
  }

  function logout() {
    clearTokens();
    setUser(null);
    setProfile(null);
    setScreen("landing");
  }

  // ── Screen routing ──
  if (screen === "loading") {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--warm)" }}><Logo /></div>;
  }
  if (screen === "landing") {
    return <Landing onGo={() => { track("cta_signup_clicked"); setScreen("auth_signup"); }} onLogin={() => { track("cta_login_clicked"); setScreen("auth_login"); }} />;
  }
  if (screen === "auth_signup") return <Auth onAuth={onAuth} mode="signup" />;
  if (screen === "auth_login") return <Auth onAuth={onAuth} mode="login" />;
  if (screen === "onboard_kids") return <OnboardKids userId={user.id} onDone={afterKids} onLogout={logout} />;
  if (screen === "onboard_clubs") return <OnboardClubs userId={user.id} kids={kids} email={user?.email || profile?.email} onDone={() => setScreen("hub")} onLogout={logout} />;
  // TODO: AdminDashboard for hello@oneclubview.com
  if (screen === "hub") return <Hub user={user} profile={profile} onRefresh={(s) => { if (s === "clubs") setScreen("onboard_clubs"); }} onLogout={logout} />;
  return null;
}
