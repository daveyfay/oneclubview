import React, { useState } from 'react';
import SchoolPicker from '../SchoolPicker';

function AddKidModal({ userId, onClose, onSaved, editKid, profile, kids }) {
  const [memberType, setMemberType] = useState(editKid?._initType || "kid");
  const [name, setName] = useState(editKid?.first_name || "");
  const [dob, setDob] = useState(editKid?.date_of_birth || "");
  const [school, setSchool] = useState(editKid?.school_name || "");
  const [schoolId, setSchoolId] = useState(editKid?.school_id || null);
  const [cls, setCls] = useState(editKid?.school_class || "");
  const [teacher, setTeacher] = useState(editKid?.teacher_name || "");
  const [showSchool, setShowSchool] = useState(!!(editKid?.school_name));
  const [adultEmail, setAdultEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");
  const [sv, setSv] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSv(true);
    if (memberType === "adult") {
      // Check adult limit
      try {
        const limRes = await fetch(SB + "/functions/v1/stripe-billing", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + _t,
          },
          body: JSON.stringify({
            action: "check_limits",
            user_id: userId,
          }),
        });
        const lim = await limRes.json();
        if (lim.adults >= lim.max_adults) {
          if (lim.tier === "family_plus" || lim.is_beta) {
            setSv(false);
            showToast("Maximum adults for your plan.", "info");
            return;
          }
          if (
            confirm(
              "Adding a 3rd adult requires the Family+ plan (€14.99/mo instead of €7.99/mo). This gives you up to 4 adults and 6 kids. Upgrade now?"
            )
          ) {
            const upRes = await fetch(SB + "/functions/v1/stripe-billing", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + _t,
              },
              body: JSON.stringify({
                action: "upgrade",
                user_id: userId,
              }),
            });
            const upData = await upRes.json();
            if (upData.needs_checkout) {
              const coRes = await fetch(
                SB + "/functions/v1/stripe-billing",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + _t,
                  },
                  body: JSON.stringify({
                    action: "checkout",
                    user_id: userId,
                    email: profile?.email,
                    tier: "family_plus",
                    return_url: window.location.origin,
                  }),
                }
              );
              const coData = await coRes.json();
              if (coData.url) {
                window.location.href = coData.url;
                return;
              }
            }
            // Upgraded in-place, continue adding
          } else {
            setSv(false);
            return;
          }
        }
      } catch (e) {}
      let fid = profile?.family_id;
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
      if (fid && adultEmail.trim()) {
        await db("family_invites", "POST", {
          body: {
            family_id: fid,
            invited_by: userId,
            invited_email: adultEmail.trim().toLowerCase(),
            invited_name: name.trim(),
            role: inviteRole,
          },
        });
        try {
          await fetch(SB + "/functions/v1/send-invite", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + _t,
            },
            body: JSON.stringify({
              to_email: adultEmail.trim(),
              to_name: name.trim(),
              from_name: profile?.first_name || "Your partner",
              site_url: window.location.origin,
            }),
          });
        } catch (e) {}
      }
      setSv(false);
      setDone(true);
      return;
    }
    // Check kid limit
    try {
      const limRes = await fetch(SB + "/functions/v1/stripe-billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + _t,
        },
        body: JSON.stringify({
          action: "check_limits",
          user_id: userId,
        }),
      });
      const lim = await limRes.json();
      if (lim.kids >= lim.max_kids) {
        if (lim.tier === "family_plus" || lim.is_beta) {
          setSv(false);
          showToast("Maximum kids for your plan.", "info");
          return;
        }
        if (
          confirm(
            "Adding a 4th child requires the Family+ plan (€14.99/mo). This gives you up to 6 kids and 4 adults. Upgrade now?"
          )
        ) {
          const upRes = await fetch(SB + "/functions/v1/stripe-billing", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + _t,
            },
            body: JSON.stringify({
              action: "upgrade",
              user_id: userId,
            }),
          });
          const upData = await upRes.json();
          if (upData.needs_checkout) {
            const coRes = await fetch(
              SB + "/functions/v1/stripe-billing",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + _t,
                },
                body: JSON.stringify({
                  action: "checkout",
                  user_id: userId,
                  email: profile?.email,
                  tier: "family_plus",
                  return_url: window.location.origin,
                }),
              }
            );
            const coData = await coRes.json();
            if (coData.url) {
              window.location.href = coData.url;
              return;
            }
          }
        } else {
          setSv(false);
          return;
        }
      }
    } catch (e) {}
    const body = {
      first_name: name.trim(),
      date_of_birth: dob || null,
      school_name: school.trim() || null,
      school_class: cls.trim() || null,
      teacher_name: null,
      school_id: schoolId || null,
    };
    if (editKid) {
      await db("dependants", "PATCH", {
        body,
        filters: ["id=eq." + editKid.id],
      });
    } else {
      body.parent_user_id = userId;
      await db("dependants", "POST", { body });
    }
    setSv(false);
    onSaved();
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
            We've emailed {name} with an invite.
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
            {editKid ? "Edit " + editKid.first_name : "Add family member"}
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
        {!editKid && (
          <div
            style={{
              display: "flex",
              gap: 8,
              background: "#f5f3ef",
              borderRadius: 12,
              padding: 4,
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => setMemberType("kid")}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 10,
                border: "none",
                background:
                  memberType === "kid" ? "var(--g)" : "transparent",
                color:
                  memberType === "kid" ? "#fff" : "var(--mt)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--sn)",
              }}
            >
              👧 Child
            </button>
            <button
              onClick={() => setMemberType("adult")}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 10,
                border: "none",
                background:
                  memberType === "adult" ? "var(--g)" : "transparent",
                color:
                  memberType === "adult" ? "#fff" : "var(--mt)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--sn)",
              }}
            >
              👤 Adult / Partner
            </button>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <span className="lbl">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
            />
          </div>
          {memberType === "adult" && (
            <>
              <div>
                <span className="lbl">Their email</span>
                <input
                  type="email"
                  value={adultEmail}
                  onChange={(e) => setAdultEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <span className="lbl">What can they see?</span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginTop: 6,
                  }}
                >
                  {[
                    {
                      v: "admin",
                      l: "👨‍👩‍👧 Full access (parent/partner)",
                      d: "See everything — schedule, fees, camps, can edit and invite",
                    },
                    {
                      v: "carer",
                      l: "🧑‍🍳 Carer (grandparent/childminder)",
                      d: "See schedule only — no fees, no editing, no payments",
                    },
                    {
                      v: "viewer",
                      l: "👁️ Viewer (au pair/family friend)",
                      d: "See schedule only — read-only, no changes",
                    },
                  ].map((r) => (
                    <button
                      key={r.v}
                      onClick={() => setInviteRole(r.v)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border:
                          inviteRole === r.v
                            ? "2px solid var(--g)"
                            : "1px solid var(--bd)",
                        background:
                          inviteRole === r.v ? "var(--gxl)" : "#fff",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--tx)",
                        }}
                      >
                        {r.l}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--mt)",
                          marginTop: 2,
                        }}
                      >
                        {r.d}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {memberType === "kid" && (
            <>
              <div>
                <span className="lbl">Date of birth</span>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              {(() => {
                const age = dob
                  ? Math.floor(
                      (new Date() - new Date(dob)) /
                        (365.25 * 86400000)
                    )
                  : null;
                return age !== null && age < 5
                  ? null
                  : !showSchool ? (
                      <button
                        onClick={() => setShowSchool(true)}
                        style={{
                          padding: 10,
                          borderRadius: 12,
                          border: "2px dashed var(--bd)",
                          background: "none",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--mt)",
                          fontFamily: "var(--sn)",
                        }}
                      >
                        + Add school info (optional)
                      </button>
                    ) : (
                      <SchoolPicker
                        school={school}
                        setSchool={setSchool}
                        schoolId={schoolId}
                        setSchoolId={setSchoolId}
                        cls={cls}
                        setCls={setCls}
                      />
                    );
              })()}
            </>
          )}
          <button
            onClick={save}
            disabled={
              sv ||
              !name.trim() ||
              (memberType === "adult" && !adultEmail.trim())
            }
            className="btn bp"
          >
            {sv
              ? "Saving..."
              : editKid
              ? "Save changes"
              : memberType === "adult"
              ? "Send invite"
              : "Add child"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddKidModal;
