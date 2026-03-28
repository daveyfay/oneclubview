import React, { useState } from 'react';

function CancelFeedback({ userId, email, status, trialDays }) {
  const [show, setShow] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [sent, setSent] = useState(false);

  const reasons = [
    { v: "too_expensive", l: "💰 Too expensive" },
    { v: "not_useful", l: "🤷 Didn't find it useful" },
    { v: "missing_features", l: "🔧 Missing features I need" },
    { v: "too_complicated", l: "😕 Too complicated" },
    { v: "not_enough_clubs", l: "🏠 My clubs weren't there" },
    { v: "using_alternative", l: "📱 Using something else" },
    { v: "kids_stopped", l: "👧 Kids stopped activities" },
    { v: "other", l: "💬 Other reason" },
  ];

  if (sent)
    return (
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: "var(--color-sage)",
          borderRadius: 12,
          fontSize: 13,
          color: "var(--color-primary-light)",
          fontWeight: 600,
        }}
      >
        Thanks for the feedback — it really helps us improve.
      </div>
    );

  if (!show)
    return (
      <button
        onClick={() => setShow(true)}
        style={{
          marginTop: 12,
          background: "none",
          border: "none",
          fontSize: 12,
          color: "var(--color-muted)",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          textDecoration: "underline",
        }}
      >
        Not ready to subscribe? Tell us why
      </button>
    );

  return (
    <div
      style={{
        marginTop: 16,
        background: "var(--color-card)",
        borderRadius: 16,
        border: "1px solid var(--color-border)",
        padding: 16,
        textAlign: "left",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--color-primary)",
          marginBottom: 4,
        }}
      >
        We'd love to know why
      </div>
      <p style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 12 }}>
        Your feedback helps us build a better product for every parent.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {reasons.map((r) => (
          <button
            key={r.v}
            onClick={() => setReason(r.v)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border:
                reason === r.v
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-border)",
              background: reason === r.v ? "var(--color-primary-bg)" : "#fff",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              textAlign: "left",
            }}
          >
            {r.l}
          </button>
        ))}
      </div>
      {reason && (
        <>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Anything else you'd like to share? (optional)"
            rows={2}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              resize: "vertical",
              marginBottom: 8,
            }}
          />
          <button
            onClick={async () => {
              await db("cancellation_feedback", "POST", {
                body: {
                  user_id: userId,
                  user_email: email,
                  reason,
                  detail: detail.trim() || null,
                  subscription_status: status,
                  days_active: trialDays || null,
                },
              });
              setSent(true);
            }}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: "none",
              background: "var(--color-primary)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Send feedback
          </button>
        </>
      )}
    </div>
  );
}

export default CancelFeedback;
