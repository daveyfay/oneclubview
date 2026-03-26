import React, { useState } from 'react';
import { SB, db, getToken } from '../../lib/supabase';

function InviteAdultModal({ userId, familyId, onClose, onSaved }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("admin");
  const [sv, setSv] = useState(false);
  const [done, setDone] = useState(false);

  async function send() {
    if (!email.trim()) return;
    setSv(true);
    // Ensure family exists
    let fid = familyId;
    if (!fid) {
      const fam = await db("families", "POST", {
        body: { created_by: userId },
      });
      if (fam && fam[0]) {
        fid = fam[0].id;
        await db("profiles", "PATCH", {
          body: { family_id: fid },
          filters: ["id=eq." + userId],
        });
      }
    }
    if (fid) {
      await db("family_invites", "POST", {
        body: {
          family_id: fid,
          invited_by: userId,
          invited_email: email.trim().toLowerCase(),
          invited_name: name.trim() || null,
          role: role,
        },
      });
      // Send email via edge function
      try {
        const prof = await db("profiles", "GET", {
          filters: ["id=eq." + userId],
        });
        const myName = (prof && prof[0]?.first_name) || "Your partner";
        await fetch(SB + "/functions/v1/send-invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + getToken(),
          },
          body: JSON.stringify({
            to_email: email.trim(),
            to_name: name.trim() || null,
            from_name: myName,
            site_url: window.location.origin,
          }),
        });
      } catch (e) {
        console.log("Email send skipped:", e);
      }
      setDone(true);
    }
    setSv(false);
  }

  if (done)
    return (
      <div
        className="mbg"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="mbox" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3
            style={{
              fontFamily: "var(--sr)",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--g)",
            }}
          >
            Invite sent!
          </h3>
          <p style={{ fontSize: 14, color: "var(--mt)", margin: "8px 0 12px" }}>
            We've emailed {name || email} with an invite. You can also share this
            link directly:
          </p>
          <div
            style={{
              background: "#f5f3ef",
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--tx)",
                wordBreak: "break-all",
              }}
            >
              oneclubview.com
            </span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText("https://oneclubview.com");
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: "var(--g)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--sn)",
                whiteSpace: "nowrap",
              }}
            >
              Copy link
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--mt)", marginBottom: 16 }}>
            Once they create an account, they'll see your shared family calendar
            with all clubs, events, and camps.
          </p>
          <button onClick={onClose} className="btn bp">
            Done
          </button>
        </div>
      </div>
    );

  return (
    <div
      className="mbg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mbox">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              fontFamily: "var(--sr)",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--g)",
            }}
          >
            Invite a family member
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--mt)",
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ fontSize: 13, color: "var(--mt)", marginBottom: 16 }}>
          Add your partner or another adult. They'll get their own login and see
          the same family calendar.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <span className="lbl">Their name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
            />
          </div>
          <div>
            <span className="lbl">Their email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <span className="lbl">Their role</span>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { v: "admin", l: "👨‍👩‍👧 Parent" },
                { v: "carer", l: "🧑‍🍳 Carer" },
                { v: "viewer", l: "👁️ Viewer" },
              ].map((r) => (
                <button
                  key={r.v}
                  onClick={() => setRole(r.v)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    borderRadius: 10,
                    border:
                      role === r.v
                        ? "2px solid var(--g)"
                        : "2px solid var(--bd)",
                    background:
                      role === r.v ? "var(--gxl)" : "var(--card)",
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      role === r.v ? "var(--g)" : "var(--mt)",
                    cursor: "pointer",
                    fontFamily: "var(--sn)",
                  }}
                >
                  {r.l}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={send}
            disabled={sv || !email.trim()}
            className="btn bp"
          >
            {sv ? "Sending..." : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InviteAdultModal;
