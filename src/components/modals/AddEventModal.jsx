import React, { useState } from 'react';
import { db } from '../../lib/supabase';
import { showToast } from '../../lib/utils';
import OcvModal from './OcvModal';

const DAYF = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function AddEventModal({ clubs, userId, kids, profile, onClose, onSaved }) {
  const [cid, setCid] = useState(clubs[0]?.club_id || "");
  const [mid, setMid] = useState("self");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("recurring");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [dur, setDur] = useState(60);
  const [dow, setDow] = useState(1);
  const [sv, setSv] = useState(false);
  const [driver, setDriver] = useState("");

  async function save() {
    if (!title.trim() || !cid) return;
    setSv(true);
    const dep = mid === "self" ? null : mid;
    let result;
    if (type === "recurring") {
      result = await db("recurring_events", "POST", {
        body: {
          user_id: userId,
          club_id: cid,
          dependant_id: dep,
          title: title.trim(),
          frequency: "weekly",
          day_of_week: parseInt(dow),
          start_time: time + ":00",
          duration_minutes: endTime
            ? Math.max(
                30,
                Math.round(
                  (new Date("2000-01-01T" + endTime) -
                    new Date("2000-01-01T" + time)) /
                    60000
                )
              )
            : parseInt(dur),
          starts_from: new Date().toISOString().split("T")[0],
          excluded_dates: [],
          driver: driver || null,
        },
      });
    } else {
      if (!date) {
        setSv(false);
        return;
      }
      const startDt = date + "T" + time + ":00";
      const endDt = endTime ? date + "T" + endTime + ":00" : null;
      result = await db("manual_events", "POST", {
        body: {
          user_id: userId,
          club_id: cid,
          dependant_id: dep,
          title: title.trim(),
          event_date: startDt,
          end_date: endDt,
          driver: driver || null,
        },
      });
    }
    setSv(false);
    if (!result) {
      showToast("Failed to save. Please try again.", "err");
      return;
    }
    onSaved();
  }

  const ICN = { car: "\u{1F697}" };

  return (
    <OcvModal
      open={true}
      onClose={onClose}
      title="Add Event"
      footer={
        <button
          onClick={save}
          disabled={sv || !title.trim() || !cid}
          className="btn btn-primary"
        >
          {sv
            ? "Saving..."
            : clubs.length === 0
            ? "Add a club first"
            : "Save event"}
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <span className="label">Club</span>
          {clubs.length === 0 ? (
            <p style={{ fontSize: 13, color: "#dc2626", padding: 8 }}>
              No clubs added yet. Add a club first.
            </p>
          ) : (
            <select value={cid} onChange={(e) => setCid(e.target.value)}>
              {clubs.map((c) => (
                <option key={c.club_id} value={c.club_id}>
                  {c.club_name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <span className="label">Who is this for?</span>
          <select value={mid} onChange={(e) => setMid(e.target.value)}>
            <option value="self">{profile?.first_name || "Me"}</option>
            {kids.map((k) => (
              <option key={k.id} value={k.id}>
                {k.first_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">What</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Training, Match"
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            background: "#f5f3ef",
            borderRadius: 12,
            padding: 4,
          }}
        >
          <button
            onClick={() => setType("recurring")}
            className={"pill " + (type === "recurring" ? "pill-active" : "pill-inactive")}
            style={{ flex: 1, padding: 8 }}
          >
            Every week
          </button>
          <button
            onClick={() => setType("oneoff")}
            className={"pill " + (type === "oneoff" ? "pill-active" : "pill-inactive")}
            style={{ flex: 1, padding: 8 }}
          >
            One-off
          </button>
        </div>
        {type === "recurring" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <span className="label">Day</span>
              <select value={dow} onChange={(e) => setDow(e.target.value)}>
                {DAYF.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <span className="label">Start time</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span className="label">End time</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <span className="label">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <span className="label">Start time</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span className="label">End time</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        <div>
          <span className="label">Who's driving? (optional)</span>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            {[
              profile?.first_name || "Me",
              ...kids.map((k) => k.first_name),
            ].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDriver(driver === d ? "" : d)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  border:
                    driver === d
                      ? "2px solid var(--color-primary)"
                      : "1.5px solid var(--color-border)",
                  background:
                    driver === d ? "var(--color-primary-bg)" : "var(--color-card)",
                  fontSize: 12,
                  fontWeight: 600,
                  color:
                    driver === d ? "var(--color-primary-light)" : "var(--color-muted)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <span style={{ display: "flex" }}>{ICN.car}</span> {d}
              </button>
            ))}
          </div>
        </div>
      </div>
    </OcvModal>
  );
}

export default AddEventModal;
