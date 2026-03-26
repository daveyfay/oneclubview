import React, { useState } from 'react';
import { db } from '../../lib/supabase';
import { showToast } from '../../lib/utils';

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
      result = await db("manual_events", "POST", {
        body: {
          user_id: userId,
          club_id: cid,
          dependant_id: dep,
          title: title.trim(),
          event_date: date + "T" + time + ":00",
          duration_minutes: endTime
            ? Math.max(
                30,
                Math.round(
                  (new Date("2000-01-01T" + endTime) -
                    new Date("2000-01-01T" + time)) /
                    60000
                )
              )
            : parseInt(dur) || 60,
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

  const ICN = { car: "🚗" };

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
            Add Event
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <span className="lbl">Club</span>
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
            <span className="lbl">Who is this for?</span>
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
            <span className="lbl">What</span>
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
              className={"pill " + (type === "recurring" ? "pon" : "poff")}
              style={{ flex: 1, padding: 8 }}
            >
              Every week
            </button>
            <button
              onClick={() => setType("oneoff")}
              className={"pill " + (type === "oneoff" ? "pon" : "poff")}
              style={{ flex: 1, padding: 8 }}
            >
              One-off
            </button>
          </div>
          {type === "recurring" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <span className="lbl">Day</span>
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
                  <span className="lbl">Start time</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="lbl">End time</span>
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
                <span className="lbl">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <span className="lbl">Start time</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="lbl">End time</span>
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
            <span className="lbl">Who's driving? (optional)</span>
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
                        ? "2px solid var(--g)"
                        : "1.5px solid var(--bd)",
                    background:
                      driver === d ? "var(--gxl)" : "var(--card)",
                    fontSize: 12,
                    fontWeight: 600,
                    color:
                      driver === d ? "var(--gl)" : "var(--mt)",
                    cursor: "pointer",
                    fontFamily: "var(--sn)",
                  }}
                >
                  <span style={{ display: "flex" }}>{ICN.car}</span> {d}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={save}
            disabled={sv || !title.trim() || !cid}
            className="btn bp"
          >
            {sv
              ? "Saving..."
              : clubs.length === 0
              ? "Add a club first"
              : "Save event"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddEventModal;
