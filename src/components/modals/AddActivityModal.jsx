import React, { useState } from 'react';
import { db } from '../../lib/supabase';

function AddActivityModal({ userId, userLoc, profile, kids, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");
  const [loc, setLoc] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [cost, setCost] = useState("");
  const [termName, setTermName] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [assignKid, setAssignKid] = useState("");
  const [sv, setSv] = useState(false);
  const [done, setDone] = useState(false);

  const categories = [
    { v: "martial_arts", l: "🥋 Martial Arts" },
    { v: "dance", l: "💃 Dance" },
    { v: "music", l: "🎵 Music" },
    { v: "art", l: "🎨 Art / Craft" },
    { v: "drama", l: "🎭 Drama" },
    { v: "language", l: "🗣️ Language" },
    { v: "tutoring", l: "📚 Tutoring" },
    { v: "sport", l: "⚽ Sport" },
    { v: "swimming", l: "🏊 Swimming" },
    { v: "scouts", l: "⚜️ Scouts / Guides" },
    { v: "coding", l: "💻 Coding" },
    { v: "other", l: "📌 Other" },
  ];
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  async function save() {
    if (!name.trim() || !cat) return;
    setSv(true);
    const slug =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, "-") +
      "-" +
      Date.now().toString(36);
    // Create the club/activity
    const clubRes = await db("clubs", "POST", {
      body: {
        name: name.trim(),
        slug,
        category: cat,
        location: loc.trim() || profile?.first_name + "'s area",
        address: loc.trim() || null,
        latitude: userLoc?.lat || null,
        longitude: userLoc?.lng || null,
        source: "user_added",
        added_by: userId,
        is_private: false,
        contact_name: contact.trim() || null,
        contact_phone: phone.trim() || null,
        term_cost: cost ? parseFloat(cost) : null,
        term_name: termName.trim() || null,
      },
    });
    if (clubRes && clubRes[0]) {
      const clubId = clubRes[0].id || clubRes[0].club_id;
      // Subscribe user to this club
      await db("hub_subscriptions", "POST", {
        body: {
          user_id: userId,
          club_id: clubId,
          dependant_id: assignKid || null,
        },
      });
      // Create recurring event if day/time provided
      if (day && time && clubId) {
        const dow = days.indexOf(day);
        await db("recurring_events", "POST", {
          body: {
            user_id: userId,
            club_id: clubId,
            dependant_id: assignKid || null,
            title: name.trim(),
            day_of_week: dow,
            start_time: time,
            duration_minutes: parseInt(duration) || 60,
            active: true,
          },
        });
      }
      // Add fee reminder if cost provided
      if (cost && parseFloat(cost) > 0 && clubId) {
        await db("payment_reminders", "POST", {
          body: {
            user_id: userId,
            club_id: clubId,
            dependant_id: assignKid || null,
            description: (termName || "Term") + " fee",
            amount: parseFloat(cost),
            due_date: new Date(Date.now() + 14 * 86400000)
              .toISOString()
              .split("T")[0],
          },
        });
      }
    }
    setSv(false);
    setDone(true);
    setTimeout(onSaved, 1000);
  }

  if (done)
    return (
      <div className="mbg" onClick={onClose}>
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
            Activity added!
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--mt)",
              margin: "8px 0",
            }}
          >
            It's now in your clubs and schedule.
          </p>
        </div>
      </div>
    );

  return (
    <div
      className="mbg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mbox" style={{ maxHeight: "85vh", overflowY: "auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
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
            Add an activity
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
        <p style={{ fontSize: 12, color: "var(--mt)", marginBottom: 14 }}>
          For classes, lessons, or activities that aren't a formal club — like a
          local karate class, music teacher, or dance school.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Name */}
          <div>
            <span className="lbl">Activity name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master Dong's Karate, Sarah's Piano Lessons"
            />
          </div>

          {/* Category */}
          <div>
            <span className="lbl">Type</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
              {categories.map((c) => (
                <button
                  key={c.v}
                  onClick={() => setCat(c.v)}
                  style={{
                    padding: "6px 4px",
                    borderRadius: 8,
                    border:
                      cat === c.v
                        ? "2px solid var(--g)"
                        : "1px solid var(--bd)",
                    background: cat === c.v ? "var(--gxl)" : "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--tx)",
                    cursor: "pointer",
                    fontFamily: "var(--sn)",
                  }}
                >
                  {c.l}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <span className="lbl">Where (optional)</span>
            <input
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="e.g. Hollypark School hall, instructor's house"
            />
          </div>

          {/* Contact */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <span className="lbl">Contact name (optional)</span>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. Master Dong"
              />
            </div>
            <div>
              <span className="lbl">Phone / WhatsApp (optional)</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="085 123 4567"
              />
            </div>
          </div>

          {/* Which kid */}
          {kids.length > 0 && (
            <div>
              <span className="lbl">Who attends</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button
                  onClick={() => setAssignKid("")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    border:
                      !assignKid
                        ? "1.5px solid var(--g)"
                        : "1.5px solid var(--bd)",
                    background: !assignKid ? "var(--gxl)" : "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    color: !assignKid ? "var(--g)" : "var(--mt)",
                    cursor: "pointer",
                    fontFamily: "var(--sn)",
                  }}
                >
                  Me
                </button>
                {kids.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setAssignKid(k.id)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      border:
                        assignKid === k.id
                          ? "1.5px solid var(--g)"
                          : "1.5px solid var(--bd)",
                      background:
                        assignKid === k.id ? "var(--gxl)" : "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        assignKid === k.id ? "var(--g)" : "var(--mt)",
                      cursor: "pointer",
                      fontFamily: "var(--sn)",
                    }}
                  >
                    {k.first_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Schedule */}
          <div>
            <span className="lbl">When (optional — adds to your schedule)</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid var(--bd)",
                  fontSize: 12,
                  fontFamily: "var(--sn)",
                }}
              >
                <option value="">Day</option>
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid var(--bd)",
                  fontSize: 12,
                  fontFamily: "var(--sn)",
                }}
              />
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid var(--bd)",
                  fontSize: 12,
                  fontFamily: "var(--sn)",
                }}
              >
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>

          {/* Term cost */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <span className="lbl">Term fee (optional)</span>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 120"
              />
            </div>
            <div>
              <span className="lbl">Term name (optional)</span>
              <input
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                placeholder="e.g. Spring 2026"
              />
            </div>
          </div>

          <button
            onClick={save}
            disabled={sv || !name.trim() || !cat}
            className="btn bp"
            style={{ marginTop: 4 }}
          >
            {sv ? "Saving..." : "Add activity"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddActivityModal;
