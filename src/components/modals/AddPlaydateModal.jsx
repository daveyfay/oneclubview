import React, { useState } from 'react';
import { db } from '../../lib/supabase';
import { showToast } from '../../lib/utils';

function AddPlaydateModal({ userId, kids, profile, onClose, onSaved }) {
  const [mid, setMid] = useState(kids[0]?.id || "self");
  const [friendName, setFriendName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("15:00");
  const [endTime, setEndTime] = useState("17:00");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [sv, setSv] = useState(false);

  async function save() {
    if (!friendName.trim() || !date) {
      showToast("Please add friend name and date", "err");
      return;
    }
    setSv(true);
    const dep = mid === "self" ? null : mid;
    const kidName = mid === "self"
      ? (profile?.first_name || "You")
      : kids.find(k => k.id === mid)?.first_name || "";

    // Build description with contact details
    const descParts = [];
    if (parentName.trim()) descParts.push("Parent: " + parentName.trim());
    if (parentPhone.trim()) descParts.push("Contact: " + parentPhone.trim());
    if (location.trim()) descParts.push("Where: " + location.trim());
    if (notes.trim()) descParts.push(notes.trim());

    const result = await db("manual_events", "POST", {
      body: {
        user_id: userId,
        dependant_id: dep,
        title: "Playdate with " + friendName.trim(),
        event_date: date + "T" + time + ":00",
        duration_minutes: endTime
          ? Math.max(30, Math.round(
              (new Date("2000-01-01T" + endTime) - new Date("2000-01-01T" + time)) / 60000
            ))
          : 120,
        description: descParts.join(" · "),
      },
    });
    setSv(false);
    if (!result) {
      showToast("Failed to save. Please try again.", "err");
      return;
    }
    showToast("Playdate added! 🤝");
    onSaved();
  }

  return (
    <div className="mbg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mbox">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "var(--sr)", fontSize: 18, fontWeight: 700, color: "var(--g)" }}>
            Add Playdate
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--mt)" }}>
            ✕
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Which kid */}
          <div>
            <span className="lbl">Who is this for?</span>
            <select value={mid} onChange={e => setMid(e.target.value)}>
              {kids.map(k => (
                <option key={k.id} value={k.id}>{k.first_name}</option>
              ))}
              <option value="self">{profile?.first_name || "Me"}</option>
            </select>
          </div>

          {/* Friend */}
          <div>
            <span className="lbl">Playing with</span>
            <input
              value={friendName}
              onChange={e => setFriendName(e.target.value)}
              placeholder="Friend's name"
              autoFocus
            />
          </div>

          {/* Parent details */}
          <div style={{ background: "#f8f7f4", borderRadius: 14, padding: 14, border: "1px solid var(--bd)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mt)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>Parent / Guardian</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <span className="lbl">Name</span>
                <input
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                  placeholder="e.g. Sarah Murphy"
                />
              </div>
              <div>
                <span className="lbl">Phone / Contact</span>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={e => setParentPhone(e.target.value)}
                  placeholder="085 123 4567"
                />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <span className="lbl">Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span className="lbl">Start time</span>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <span className="lbl">End time</span>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Location */}
          <div>
            <span className="lbl">Where (optional)</span>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Their house, Marlay Park"
            />
          </div>

          {/* Notes */}
          <div>
            <span className="lbl">Notes (optional)</span>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Bring runners, pick up at 5..."
            />
          </div>

          <button
            onClick={save}
            disabled={sv || !friendName.trim() || !date}
            className="btn bp"
          >
            {sv ? "Saving..." : "Save playdate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddPlaydateModal;
