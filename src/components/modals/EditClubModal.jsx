import React, { useState, useEffect } from 'react';
import { db } from '../../lib/supabase';
import { COLS } from '../../lib/constants';
import OcvModal from './OcvModal';

function EditClubModal({
  club,
  kids,
  profile,
  userId,
  onClose,
  onSaved,
  onDelete,
}) {
  const COLOUR_OPTIONS = ["#2d7cb5","#2d5a3f","#c4960c","#9b4dca","#d64545","#1a8a7d","#e67e22","#e84393","#3b82f6","#22c55e","#ef4444","#1a2a3a"];
  const [who, setWho] = useState([]);
  const [nickname, setNickname] = useState("");
  const [clubColour, setClubColour] = useState(club.colour || "#2d5a3f");
  const [sv, setSv] = useState(false);
  const [clubUrl, setClubUrl] = useState("");
  const [clubFb, setClubFb] = useState("");
  const [clubPhone, setClubPhone] = useState("");
  const [clubEmail, setClubEmail] = useState("");
  const [clubEircode, setClubEircode] = useState("");
  const [clubNotes, setClubNotes] = useState("");
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");
  const [allSubs, setAllSubs] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load club details and all subscriptions for this club
    (async () => {
      const clubData = await db("clubs", "GET", {
        filters: ["id=eq." + club.club_id],
      });
      if (clubData && clubData[0]) {
        const cd = clubData[0];
        setClubUrl(cd.website_url || "");
        setClubFb(cd.facebook_url || "");
        setClubPhone(cd.contact_phone || "");
        setClubEmail(cd.contact_email || "");
        setClubEircode(cd.eircode || "");
        setClubNotes(cd.notes || "");
        setTermStart(cd.term_start || "");
        setTermEnd(cd.term_end || "");
      }
      const subs = await db("hub_subscriptions", "GET", {
        filters: ["user_id=eq." + userId, "club_id=eq." + club.club_id],
      });
      const ids = (subs || []).map((s) => s.dependant_id || "self");
      if (subs && subs[0] && subs[0].nickname) setNickname(subs[0].nickname);
      if (subs && subs[0] && subs[0].colour) setClubColour(subs[0].colour);
      setWho(ids);
      setAllSubs(subs || []);
      setLoaded(true);
    })();
  }, []);

  async function save() {
    setSv(true);
    // Update club details
    await db("clubs", "PATCH", {
      body: {
        website_url: clubUrl.trim() || null,
        facebook_url: clubFb.trim() || null,
        contact_phone: clubPhone.trim() || null,
        contact_email: clubEmail.trim() || null,
        eircode: clubEircode.trim() || null,
        notes: clubNotes.trim() || null,
        term_start: termStart || null,
        term_end: termEnd || null,
      },
      filters: ["id=eq." + club.club_id],
    });
    // Update nickname and colour on all existing subs
    for (const s of allSubs) {
      await db("hub_subscriptions", "PATCH", {
        body: { nickname: nickname.trim() || null, colour: clubColour },
        filters: ["id=eq." + s.id],
      });
    }
    // Sync subscriptions: remove old ones, add new ones
    const currentIds = allSubs.map((s) => s.dependant_id || "self");
    // Remove subs no longer selected
    for (const s of allSubs) {
      const sid = s.dependant_id || "self";
      if (!who.includes(sid)) {
        await db("hub_subscriptions", "DELETE", {
          filters: ["id=eq." + s.id],
        });
      }
    }
    // Add new subs
    for (const w of who) {
      if (!currentIds.includes(w)) {
        await db("hub_subscriptions", "POST", {
          body: {
            user_id: userId,
            club_id: club.club_id,
            dependant_id: w === "self" ? null : w,
            colour: club.colour || "#2d5a3f",
            nickname: nickname.trim() || null,
          },
        });
      }
    }
    setSv(false);
    onSaved();
  }

  async function remove() {
    if (!confirm("Remove " + club.club_name + " from your family?")) return;
    setSv(true);
    for (const s of allSubs) {
      await db("hub_subscriptions", "DELETE", {
        filters: ["id=eq." + s.id],
      });
    }
    setSv(false);
    onDelete();
  }

  function toggleMember(id) {
    setWho((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (!loaded)
    return (
      <OcvModal open={true} onClose={onClose} title="Loading...">
        <div style={{ textAlign: "center", padding: 20 }}>
          <p>Loading...</p>
        </div>
      </OcvModal>
    );

  return (
    <OcvModal
      open={true}
      onClose={onClose}
      title={club.club_name}
      footer={
        <>
          <button
            onClick={save}
            disabled={sv}
            className="btn btn-primary"
            style={{ marginBottom: 8 }}
          >
            {sv ? "Saving..." : "Save changes"}
          </button>
          <button
            onClick={remove}
            disabled={sv}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: "none",
              background: "#fef2f2",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "#dc2626",
              fontFamily: "var(--font-sans)",
            }}
          >
            Remove club
          </button>
        </>
      }
    >
      {club.club_addr && (
        <p style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 12 }}>
          {club.club_addr}
        </p>
      )}

      {/* Who attends - multi-select */}
      <div style={{ marginBottom: 12 }}>
        <span className="label">Nickname (shows on schedule)</span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={"e.g. Gym, Swimming, GAA"}
          style={{ marginBottom: 4 }}
        />
        <span style={{ fontSize: 11, color: "var(--color-muted)" }}>
          This is what you'll see on the weekly schedule instead of the full
          club name
        </span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <span className="label">Schedule colour</span>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {COLOUR_OPTIONS.map((col) => (
            <button
              key={col}
              onClick={() => setClubColour(col)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: col,
                border: clubColour === col ? "3px solid #1a2a3a" : "1px solid rgba(0,0,0,.1)",
                cursor: "pointer",
                padding: 0,
                transition: "border .15s"
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <span className="label">Who goes to this club?</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          <button
            onClick={() => toggleMember("self")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: who.includes("self")
                ? "2px solid var(--color-primary)"
                : "2px solid var(--color-border)",
              background: who.includes("self")
                ? "var(--color-primary-bg)"
                : "var(--color-card)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: who.includes("self") ? "var(--color-primary-light)" : "var(--color-muted)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {'\u{1F464}'} {profile?.first_name || "Me"}
          </button>
          {kids.map((k) => (
            <button
              key={k.id}
              onClick={() => toggleMember(k.id)}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: who.includes(k.id)
                  ? "2px solid var(--color-primary)"
                  : "2px solid var(--color-border)",
                background: who.includes(k.id)
                  ? "var(--color-primary-bg)"
                  : "var(--color-card)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: who.includes(k.id) ? "var(--color-primary-light)" : "var(--color-muted)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {'\u{1F467}'} {k.first_name}
            </button>
          ))}
        </div>
      </div>

      {/* Club details toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          background: "var(--color-card)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-muted)",
          fontFamily: "var(--font-sans)",
          marginBottom: 12,
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          Club details {clubUrl || clubPhone ? "(added)" : ""}
        </span>
        <span>{showDetails ? "\u25B2" : "\u25BC"}</span>
      </button>

      {showDetails && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 16,
            background: "#f8f7f4",
            borderRadius: 14,
            padding: 14,
            border: "1px solid var(--color-border)",
          }}
        >
          <div>
            <span className="label">Website</span>
            <input
              value={clubUrl}
              onChange={(e) => setClubUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <span className="label">Facebook page</span>
            <input
              value={clubFb}
              onChange={(e) => setClubFb(e.target.value)}
              placeholder="https://facebook.com/..."
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span className="label">Phone</span>
              <input
                value={clubPhone}
                onChange={(e) => setClubPhone(e.target.value)}
                placeholder="085..."
              />
            </div>
            <div style={{ flex: 1 }}>
              <span className="label">Email</span>
              <input
                value={clubEmail}
                onChange={(e) => setClubEmail(e.target.value)}
                placeholder="info@club.ie"
              />
            </div>
          </div>
          <div>
            <span className="label">Eircode</span>
            <input
              value={clubEircode}
              onChange={(e) => setClubEircode(e.target.value)}
              placeholder="D05 X1Y2"
              style={{ maxWidth: 140 }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span className="label">Term starts</span>
              <input
                type="date"
                value={termStart}
                onChange={(e) => setTermStart(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span className="label">Term ends</span>
              <input
                type="date"
                value={termEnd}
                onChange={(e) => setTermEnd(e.target.value)}
              />
            </div>
          </div>
          <div>
            <span className="label">Notes</span>
            <textarea
              value={clubNotes}
              onChange={(e) => setClubNotes(e.target.value)}
              placeholder="Coach name, WhatsApp group link, gear needed..."
              rows={3}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                fontSize: 13,
                fontFamily: "var(--font-sans)",
                resize: "vertical",
              }}
            />
          </div>
        </div>
      )}

      {/* Quick links if URLs set */}
      {(clubUrl || clubFb) && !showDetails && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {clubUrl && (
            <a
              href={clubUrl}
              target="_blank"
              rel="noopener"
              style={{
                flex: 1,
                textAlign: "center",
                padding: 8,
                borderRadius: 10,
                background: "var(--color-primary)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Website
            </a>
          )}
          {clubFb && (
            <a
              href={clubFb}
              target="_blank"
              rel="noopener"
              style={{
                flex: 1,
                textAlign: "center",
                padding: 8,
                borderRadius: 10,
                background: "#1877F2",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Facebook
            </a>
          )}
        </div>
      )}

      {/* Term info if set */}
      {termStart && termEnd && !showDetails && (
        <div
          style={{
            fontSize: 12,
            color: "var(--color-muted)",
            marginBottom: 12,
            background: "var(--color-sage)",
            padding: "8px 12px",
            borderRadius: 10,
          }}
        >
          {'\u{1F4C5}'} Current term:{" "}
          {new Date(termStart).toLocaleDateString("en-IE", {
            day: "numeric",
            month: "short",
          })}{" "}
          {'\u2013'}{" "}
          {new Date(termEnd).toLocaleDateString("en-IE", {
            day: "numeric",
            month: "short",
          })}
        </div>
      )}
    </OcvModal>
  );
}

export default EditClubModal;
