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

    const startDt = date + "T" + time + ":00";
    const endDt = endTime ? date + "T" + endTime + ":00" : null;

    const result = await db("manual_events", "POST", {
      body: {
        user_id: userId,
        dependant_id: dep,
        title: "Playdate with " + friendName.trim(),
        event_date: startDt,
        end_date: endDt,
        location: location.trim() || null,
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
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, color: "var(--color-primary)" }}>
            Add Playdate
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-muted)" }}>
            ✕
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Which kid */}
          <div>
            <span className="label">Who is this for?</span>
            <select value={mid} onChange={e => setMid(e.target.value)}>
              {kids.map(k => (
                <option key={k.id} value={k.id}>{k.first_name}</option>
              ))}
              <option value="self">{profile?.first_name || "Me"}</option>
            </select>
          </div>

          {/* Friend */}
          <div>
            <span className="label">Playing with</span>
            <input
              value={friendName}
              onChange={e => setFriendName(e.target.value)}
              placeholder="Friend's name"
              autoFocus
            />
          </div>

          {/* Parent details */}
          <div style={{ background: "#f8f7f4", borderRadius: 14, padding: 14, border: "1px solid var(--color-border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>Parent / Guardian</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <span className="label">Name</span>
                <input
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                  placeholder="e.g. Sarah Murphy"
                />
              </div>
              <div>
                <span className="label">Phone / Contact</span>
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
            <span className="label">Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span className="label">Start time</span>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <span className="label">End time</span>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Location */}
          <div>
            <span className="label">Where (optional)</span>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Their house, Marlay Park"
            />
          </div>

          {/* Notes */}
          <div>
            <span className="label">Notes (optional)</span>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Bring runners, pick up at 5..."
            />
          </div>

          <button
            onClick={save}
            disabled={sv || !friendName.trim() || !date}
            className="btn btn-primary"
          >
            {sv ? "Saving..." : "Save playdate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddPlaydateModal;
