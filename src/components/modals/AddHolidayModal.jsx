import React, { useState } from 'react';
import { db } from '../../lib/supabase';
import OcvModal from './OcvModal';

function AddHolidayModal({ userId, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [sv, setSv] = useState(false);

  async function save() {
    if (!name.trim() || !start || !end) return;
    setSv(true);
    await db("user_school_holidays", "POST", {
      body: {
        user_id: userId,
        name: name.trim(),
        start_date: start,
        end_date: end,
        holiday_type: "custom",
      },
    });
    setSv(false);
    onSaved();
  }

  return (
    <OcvModal
      open={true}
      onClose={onClose}
      title="Add School Holiday"
      footer={
        <button
          onClick={save}
          disabled={sv || !name.trim() || !start || !end}
          className="btn btn-primary"
        >
          {sv ? "Saving..." : "Add holiday"}
        </button>
      }
    >
      <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 16 }}>
        Add a holiday your school has that's not in the standard calendar
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <span className="label">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. School closure day, Staff training day"
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <span className="label">Starts</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span className="label">Ends</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
      </div>
    </OcvModal>
  );
}

export default AddHolidayModal;
