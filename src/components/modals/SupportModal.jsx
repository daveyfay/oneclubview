import React, { useState } from 'react';

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
      <div
        className="mbg"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
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
            Ticket submitted!
          </h3>
          {ticketNum && (
            <div
              style={{
                background: "var(--gxl)",
                borderRadius: 10,
                padding: "8px 16px",
                display: "inline-block",
                margin: "8px 0",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--g)",
                fontFamily: "monospace",
              }}
            >
              OCV-{String(ticketNum).padStart(3, "0")}
            </div>
          )}
          <p style={{ fontSize: 13, color: "var(--mt)", margin: "8px 0 16px" }}>
            We'll get back to you at {userEmail}
          </p>
          <button onClick={onClose} className="btn bp">
            Done
          </button>
        </div>
      </div>
    );

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
            marginBottom: 16,
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
            Contact Support
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
            <span className="lbl">Category</span>
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
                        ? "2px solid var(--g)"
                        : "1px solid var(--bd)",
                    background:
                      category === c.v ? "var(--gxl)" : "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--tx)",
                    cursor: "pointer",
                    fontFamily: "var(--sn)",
                    textAlign: "left",
                  }}
                >
                  {c.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="lbl">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary"
            />
          </div>
          <div>
            <span className="lbl">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue..."
              rows={4}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid var(--bd)",
                fontSize: 13,
                fontFamily: "var(--sn)",
                resize: "vertical",
              }}
            />
          </div>
          <button
            onClick={send}
            disabled={sv || !subject.trim() || !message.trim()}
            className="btn bp"
          >
            {sv ? "Sending..." : "Submit ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupportModal;
