import React, { useState } from 'react';
import { db } from '../../lib/supabase';
import { showToast } from '../../lib/utils';

function AddPaymentModal({ clubs, userId, kids, profile, onClose, onSaved }) {
  const [cid, setCid] = useState(clubs[0]?.club_id || "");
  const [mid, setMid] = useState("self");
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [due, setDue] = useState("");
  const [sv, setSv] = useState(false);

  async function save() {
    if (!desc.trim() || !amt || !due) return;
    setSv(true);
    const r = await db("payment_reminders", "POST", {
      body: {
        user_id: userId,
        club_id: cid,
        dependant_id: mid === "self" ? null : mid,
        description: desc.trim(),
        amount: parseFloat(amt),
        currency: "EUR",
        due_date: due,
      },
    });
    setSv(false);
    if (!r) {
      showToast("Failed to save. Please try again.", "err");
      return;
    }
    onSaved();
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-primary)",
            }}
          >
            Add Payment Reminder
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--color-muted)",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <span className="label">Club</span>
            {clubs.length === 0 ? (
              <p style={{ fontSize: 13, color: "#dc2626", padding: 8 }}>
                No clubs added yet.
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
            <span className="label">Who</span>
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
            <span className="label">What's it for?</span>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Annual fee, camp, kit..."
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span className="label">Amount (€)</span>
              <input
                type="number"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span className="label">Due date</span>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={save}
            disabled={sv || !desc.trim() || !amt || !due || !cid}
            className="btn btn-primary"
          >
            {sv
              ? "Saving..."
              : clubs.length === 0
              ? "Add a club first"
              : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddPaymentModal;
