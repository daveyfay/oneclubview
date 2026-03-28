import React, { useState } from 'react';
import { db } from '../../lib/supabase';
import { track } from '../../lib/utils';
import OcvModal from './OcvModal';

function SupportModal({ userId, userEmail, onClose }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [sv, setSv] = useState(false);
  const [done, setDone] = useState(false);
  const [ticketNum, setTicketNum] = useState(null);

  const categories = [
    { v: "bug", l: "🐛 Bug / Something broken" },
    { v: "schedule", l: "📅 Schedule issue" },
    { v: "camps", l: "🏕️ Camps / Booking" },
    { v: "clubs", l: "🏠 Club data incorrect" },
    { v: "billing", l: "💳 Billing / Subscription" },
    { v: "account", l: "👤 Account / Login" },
    { v: "feature", l: "💡 Feature request" },
    { v: "general", l: "💬 General question" },
  ];

  async function send() {
    if (!subject.trim() || !message.trim()) return;
    setSv(true);
    const res = await db("support_tickets", "POST", {
      body: {
        user_id: userId,
        user_email: userEmail,
        subject: subject.trim(),
        message: message.trim(),
        category,
      },
    });
    if (res && res[0]?.ticket_number) setTicketNum(res[0].ticket_number);
    track("support_ticket", { category: category });
    setSv(false);
    setDone(true);
  }

  if (done)
    return (
      <OcvModal
        open={true}
        onClose={onClose}
        title="Ticket submitted!"
        footer={
          <button onClick={onClose} className="btn btn-primary">
            Done
          </button>
        }
      >
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          {ticketNum && (
            <div
              style={{
                background: "var(--color-primary-bg)",
                borderRadius: 10,
                padding: "8px 16px",
                display: "inline-block",
                margin: "8px 0",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--color-primary)",
                fontFamily: "monospace",
              }}
            >
              OCV-{String(ticketNum).padStart(3, "0")}
            </div>
          )}
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "8px 0" }}>
            We'll get back to you at {userEmail}
          </p>
        </div>
      </OcvModal>
    );

  return (
    <OcvModal
      open={true}
      onClose={onClose}
      title="Contact Support"
      footer={
        <button
          onClick={send}
          disabled={sv || !subject.trim() || !message.trim()}
          className="btn btn-primary"
        >
          {sv ? "Sending..." : "Submit ticket"}
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <span className="label">Category</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            {categories.map((c) => (
              <button
                key={c.v}
                onClick={() => setCategory(c.v)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border:
                    category === c.v
                      ? "2px solid var(--color-primary)"
                      : "1px solid var(--color-border)",
                  background:
                    category === c.v ? "var(--color-primary-bg)" : "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-text)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  textAlign: "left",
                }}
              >
                {c.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary"
          />
        </div>
        <div>
          <span className="label">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue..."
            rows={4}
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
    </OcvModal>
  );
}

export default SupportModal;
