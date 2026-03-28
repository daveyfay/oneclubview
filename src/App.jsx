import React, { useState, useEffect } from 'react';
import { au, db, SB, SK, setTokens, restoreTokens, clearTokens, getToken, getRefreshToken, refreshToken } from './lib/supabase';
import { track, showToast } from './lib/utils';
import { Capacitor } from '@capacitor/core';
import Logo from './components/Logo';
import { OcvInput } from './components/modals';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import OnboardKids from './pages/OnboardKids';
import OnboardClubs from './pages/OnboardClubs';
import Hub from './pages/Hub';
import AdminDashboard from './pages/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [kids, setKids] = useState([]);
  const [showRecoveryPw, setShowRecoveryPw] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState(null);

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
        setRecoveryToken(accessToken);
        setShowRecoveryPw(true);
        return;
      }
    }

    restoreTokens();
    const t = getToken();
    const rt = getRefreshToken();
    const isNative = Capacitor.isNativePlatform();
    const urlParams = new URLSearchParams(window.location.search);
    const justSubscribed = urlParams.get("subscribed") === "true";
    if (justSubscribed) window.history.replaceState({}, "", window.location.pathname);

    // If we have any token (access or refresh), try to restore the session
    if (t || rt) {
      // Proactively refresh if we have a refresh token — keeps users logged in
      // even after the access token expires (e.g. closed browser overnight)
      const tryAuth = async () => {
        try {
          return await au("user");
        } catch (e) {
          // Access token expired but au() already retries with refresh token.
          // If we still fail, the refresh token is also dead.
          throw e;
        }
      };

      tryAuth().then(async u => {
        const p = await db("profiles", "GET", { filters: ["id=eq." + u.id] });
        let pr = p && p[0] ? p[0] : null;
        // If returning from Stripe checkout, mark onboarding complete.
        // NOTE: subscription_status is set server-side by the Stripe webhook only —
        // never trust the client-side ?subscribed=true param for subscription state.
        if (justSubscribed && pr && !pr.onboarding_completed) {
          await db("profiles", "PATCH", { filters: ["id=eq." + u.id], body: { onboarding_completed: true, onboarding_step: "done" } });
          pr = { ...pr, onboarding_completed: true };
        }
        setUser(u);
        setProfile(pr);
        if (pr && pr.onboarding_completed) setScreen("hub");
        else { setScreen("onboard_kids"); track("onboard_kids_shown"); }
      }).catch(() => {
        clearTokens();
        // Native app: go straight to auth, not the marketing landing page
        setScreen(isNative ? "auth_login" : "landing");
      });
    } else {
      // No tokens at all — native goes to auth, web goes to landing
      setScreen(isNative ? "auth_login" : "landing");
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
    setScreen(Capacitor.isNativePlatform() ? "auth_login" : "landing");
  }

  // ── Screen routing ──
  if (screen === "loading") {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-warm)" }}><Logo /></div>;
  }
  if (screen === "landing") {
    return <Landing onGo={() => { track("cta_signup_clicked"); setScreen("auth_signup"); }} onLogin={() => { track("cta_login_clicked"); setScreen("auth_login"); }} />;
  }
  if (screen === "auth_signup") return <Auth onAuth={onAuth} mode="signup" />;
  if (screen === "auth_login") return <Auth onAuth={onAuth} mode="login" />;
  if (screen === "onboard_kids") return <OnboardKids userId={user.id} onDone={afterKids} onLogout={logout} />;
  if (screen === "onboard_clubs") return <OnboardClubs userId={user.id} kids={kids} email={user?.email || profile?.email} onDone={() => setScreen("hub")} onLogout={logout} />;
  if (screen === "hub" && user?.email === "hello@oneclubview.com" && profile?.family_role === "admin") {
    return <AdminDashboard user={user} profile={profile} onBack={() => setScreen("hub_force")} onLogout={logout} />;
  }
  if (screen === "hub" || screen === "hub_force") return <ErrorBoundary><Hub user={user} profile={profile} onRefresh={(s) => { if (s === "clubs") setScreen("onboard_clubs"); }} onLogout={logout} /></ErrorBoundary>;

  // Password recovery modal — rendered on any screen
  if (showRecoveryPw) return <>
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-warm)" }}><Logo /></div>
    <OcvInput open={showRecoveryPw} onClose={() => { setShowRecoveryPw(false); window.location.reload(); }} title="Set your new password" placeholder="New password (min 8 characters)" inputType="password" onSubmit={async (np) => {
      if (np.length < 8) { showToast("Password must be at least 8 characters.", "err"); return; }
      try {
        const r = await fetch(SB + "/auth/v1/user", {
          method: "PUT",
          headers: { apikey: SK, Authorization: "Bearer " + recoveryToken, "Content-Type": "application/json" },
          body: JSON.stringify({ password: np }),
        });
        if (r.ok) { showToast("Password changed!"); setShowRecoveryPw(false); window.location.reload(); }
        else showToast("Error changing password.", "err");
      } catch (e) { showToast("Something went wrong.", "err"); }
    }} />
  </>;

  return null;
}
