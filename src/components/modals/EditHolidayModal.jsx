import React, { useState } from 'react';

function EditHolidayModal({ holiday, userId, onClose, onSaved }) {
  const [name, setName] = useState(holiday.name);
  const [start, setStart] = useState(holiday.start_date);
  const [end, setEnd] = useState(holiday.end_date);
  const [sv, setSv] = useState(false);

  async function save() {
    setSv(true);
    if (holiday.is_user_override) {
      // Update existing user override
      await db("user_school_holidays", "PATCH", {
        body: { name, start_date: start, end_date: end },
        filters: ["id=eq." + holiday.id],
      });
    } else {
      // Create a user override from the default
      await db("user_school_holidays", "POST", {
        body: {
          user_id: userId,
          base_holiday_id: holiday.id,
          name,
          start_date: start,
          end_date: end,
          holiday_type: holiday.holiday_type,
        },
      });
    }
    setSv(false);
    onSaved();
  }

  async function reset() {
    if (!holiday.is_user_override) return;
    setSv(true);
    await db("user_school_holidays", "DELETE", {
      filters: ["id=eq." + holiday.id],
    });
    setSv(false);
    onSaved();
  }

  async function remove() {
    if (!confirm("Remove this holiday from your calendar?")) return;
    setSv(true);
    if (holiday.is_user_override) {
      await db("user_school_holidays", "DELETE", {
        filters: ["id=eq." + holiday.id],
      });
    } else {
      // Create an override that marks it as hidden
      await db("user_school_holidays", "POST", {
        body: {
          user_id: userId,
          base_holiday_id: holiday.id,
          name: holiday.name + "_hidden",
          start_date: holiday.start_date,
          end_date: holiday.start_date,
          holiday_type: "hidden",
        },
      });
    }
    setSv(false);
    onSaved();
  }

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
            Edit Holiday Dates
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
          Adjust to match your school's actual dates
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <span className="lbl">Holiday name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span className="lbl">Starts</span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span className="lbl">Ends</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={save}
            disabled={sv}
            className="btn bp"
          >
            {sv ? "Saving..." : "Save dates"}
          </button>
          {holiday.is_user_override && (
            <button
              onClick={reset}
              className="btn bs"
              style={{ fontSize: 13 }}
            >
              Reset to default dates
            </button>
          )}
          <button
            onClick={remove}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: "#dc2626",
              fontFamily: "var(--sn)",
              marginTop: 4,
            }}
          >
            Remove from my calendar
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditHolidayModal;
