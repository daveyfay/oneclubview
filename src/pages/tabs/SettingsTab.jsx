import React, { useState } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import SupportModal from '../../components/modals/SupportModal';
import AddKidModal from '../../components/modals/AddKidModal';
import { OcvConfirm, OcvInput } from '../../components/modals';
import { COLS } from '../../lib/constants';
import { track, showToast, getAge } from '../../lib/utils';
import { db, SB, hd, getToken } from '../../lib/supabase';

export default function SettingsTab({ onLogout, darkMode, setDarkMode, onClose, startCheckout, openPortal }) {
  const {
    kids, isAdmin, user, profile, load,
    familyMembers, notifications,
  } = useHubData();

  const [showSupport, setShowSupport] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [showDeleteAcct, setShowDeleteAcct] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [showAddKid, setShowAddKid] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <ErrorBoundary label="Settings">
      <>
        {/* Profile Menu */}
        <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10,15,20,.3)", zIndex: 60 }} />
        <div style={{ position: "fixed", top: 56, right: 12, zIndex: 61, background: "#fff", borderRadius: 16, border: "1px solid var(--color-border)", boxShadow: "0 8px 30px rgba(0,0,0,.12)", padding: 8, minWidth: 200 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-border)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)" }}>{profile?.first_name || "Me"}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{user?.email}</div>
          </div>
          <button onClick={() => { onClose(); setShowSupport(true) }} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-sans)", textAlign: "left", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>{"\u{1F4AC}"} Contact Support</button>
          <button onClick={() => setShowChangePw(true)} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-sans)", textAlign: "left", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>{"\u{1F511}"} Change Password</button>
          {profile?.subscription_status === "active" && <button onClick={() => { onClose(); openPortal() }} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-sans)", textAlign: "left", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>{"\u{1F4B3}"} Manage Subscription</button>}
          {profile?.is_beta ? <div style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#16a34a", display: "flex", alignItems: "center", gap: 8 }}>{"\u{1F381}"} Beta member {"\u2014"} free forever</div>
          : profile?.subscription_status !== "active" && <button onClick={() => { onClose(); startCheckout("standard") }} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-accent)", fontFamily: "var(--font-sans)", textAlign: "left", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>{"\u2B50"} Subscribe {"\u2014"} {"\u20AC"}7.99/mo</button>}
          <button onClick={() => { onClose(); setShowFamily(true) }} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-sans)", textAlign: "left", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>{"\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}"} Family Members</button>
          <a href="/privacy" style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-sans)", textAlign: "left", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>{"\u{1F512}"} Privacy & Data</a>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--color-border)" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>Dark mode</span>
            <div onClick={() => setDarkMode(!darkMode)} style={{ width: 48, height: 28, borderRadius: 14, background: darkMode ? "var(--color-accent)" : "var(--color-border)", cursor: "pointer", position: "relative", transition: "background .2s" }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: "#fff", position: "absolute", top: 3, left: darkMode ? 23 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--color-border)", marginTop: 4, paddingTop: 4 }}>
            <button onClick={() => setShowDeleteAcct(true)} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#dc2626", fontFamily: "var(--font-sans)", textAlign: "left", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>{"\u{1F5D1}\uFE0F"} Delete Account</button>
            <button onClick={() => { onClose(); onLogout() }} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#dc2626", fontFamily: "var(--font-sans)", textAlign: "left", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>{"\u{1F6AA}"} Log out</button>
          </div>
        </div>

        {/* Change Password Modal */}
        <OcvInput open={showChangePw} onClose={() => setShowChangePw(false)} title="Change password" placeholder="New password (min 8 characters)" inputType="password" onSubmit={async (np) => {
          if (np.length < 8) { showToast("Password must be at least 8 characters.", "err"); return }
          try { const r = await fetch(SB + "/auth/v1/user", { method: "PUT", headers: hd(), body: JSON.stringify({ password: np }) }); if (r.ok) showToast("Password changed!"); else showToast("Error changing password.", "err") } catch (e) { showToast("Something went wrong.", "err") }
        }} />

        {/* Delete Account Confirm */}
        <OcvConfirm open={showDeleteAcct} onClose={() => setShowDeleteAcct(false)} title="Delete account?" message={"This will permanently delete your account and all associated data. This action cannot be undone."} confirmText="Delete my account" confirmColor="#dc2626" onConfirm={async () => {
          try {
            const token = getToken();
            const res = await fetch(SB + "/functions/v1/delete-account", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            });
            const data = await res.json();
            if (data.status === "deleted") {
              showToast("Account deleted. Goodbye!");
              onLogout();
            } else {
              showToast("Something went wrong. Please email hello@oneclubview.com", "err");
            }
          } catch (e) {
            showToast("Something went wrong. Please email hello@oneclubview.com", "err");
          }
        }} />

        {/* Support Modal */}
        {showSupport && <SupportModal userId={user.id} userEmail={user.email} onClose={() => setShowSupport(false)} />}

        {/* Family Members Modal */}
        {showFamily && <div className="modal-backdrop anim-fade" onClick={() => setShowFamily(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxHeight: "80vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 800, color: "var(--color-primary)" }}>Family Members</h3>
              <button onClick={() => setShowFamily(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-muted)" }}>{"\u00D7"}</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span className="label" style={{ marginBottom: 8 }}>Kids</span>
              {kids.length === 0 && <p style={{ fontSize: 13, color: "var(--color-muted)", padding: 8 }}>No kids added yet</p>}
              {kids.map(k => {
                const age = getAge(k.date_of_birth);
                return <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: COLS[kids.indexOf(k) % COLS.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>{k.first_name?.[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{k.first_name}{age != null && <span style={{ color: "var(--color-muted)", fontWeight: 400, marginLeft: 4 }}>({age})</span>}</div>
                    {k.school_name && <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{k.school_name}{k.school_class ? " \u00B7 " + k.school_class : ""}</div>}
                  </div>
                  {isAdmin && <button onClick={() => { setShowFamily(false); setShowAddKid(k) }} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "#fff", fontSize: 12, fontWeight: 600, color: "var(--color-text)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Edit</button>}
                </div>;
              })}
              {isAdmin && <button onClick={() => { setShowFamily(false); setShowAddKid(true) }} style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 10, border: "2px dashed var(--color-border)", background: "none", fontSize: 13, fontWeight: 600, color: "var(--color-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>+ Add kid</button>}
            </div>
            <div>
              <span className="label" style={{ marginBottom: 8 }}>Adults</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>{(profile?.first_name || "U")[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{profile?.first_name || "You"}</div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{profile?.email} {"\u00B7"} Account owner</div>
                </div>
              </div>
              {familyMembers.filter(fm => fm.id !== user.id).map(fm => { const rl = fm.family_role || "admin"; const roleBadge = { admin: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467} Parent", carer: "\u{1F9D1}\u200D\u{1F373} Carer", viewer: "\u{1F441}\uFE0F Viewer" }; return <div key={fm.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: rl === "admin" ? "#8b5cf6" : rl === "carer" ? "#2d7cb5" : "#888", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>{(fm.first_name || fm.email || "?")[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{fm.first_name || fm.email}</div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{fm.email} {"\u00B7"} {roleBadge[rl] || "Admin"}</div>
                </div>
              </div> })}
              {isAdmin && <button onClick={() => { setShowFamily(false); setShowAddKid({ _initType: "adult" }) }} style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 10, border: "2px dashed var(--color-border)", background: "none", fontSize: 13, fontWeight: 600, color: "var(--color-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>+ Add family member</button>}
            </div>
          </div>
        </div>}
        {showAddKid && <AddKidModal userId={user.id} editKid={typeof showAddKid === "object" ? showAddKid : null} profile={profile} onClose={() => setShowAddKid(false)} onSaved={() => { track("add_kid"); setShowAddKid(false); load() }} />}
      </>
    </ErrorBoundary>
  );
}
