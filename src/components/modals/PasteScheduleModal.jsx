import React, { useState } from 'react';
import { SB, db, getToken } from '../../lib/supabase';
import OcvModal from './OcvModal';

function PasteScheduleModal({
  userId,
  clubs,
  kids,
  profile,
  onClose,
  onSaved,
}) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [applying, setApplying] = useState(false);

  async function parse() {
    if (!text.trim()) return;
    setParsing(true);
    setErr(null);
    try {
      const res = await fetch(SB + "/functions/v1/parse-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + getToken(),
        },
        body: JSON.stringify({
          text: text.trim(),
          kids: kids.map((k) => ({ name: k.first_name, id: k.id })),
          clubs: clubs.map((c) => ({
            name: c.club_name || c.clubs?.name,
            id: c.club_id,
            nickname: c.nickname,
          })),
          parent_name: profile?.first_name || "Parent",
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (
        data.events?.length > 0 ||
        data.fee ||
        data.action === "cancellation"
      ) {
        setResult(data);
      } else {
        setErr(
          "Couldn't find any schedule info. Try pasting a message with days, times, or fee amounts."
        );
      }
    } catch (e) {
      setErr("Failed to parse. Try again.");
    }
    setParsing(false);
  }

  async function apply() {
    setApplying(true);
    if (result.events) {
      for (const ev of result.events) {
        if (ev.cancelled) {
          // Add to excluded_dates for recurring events on that day
          // For now, create a note about the cancellation
          continue;
        }
        if (ev.recurring && ev.day_of_week != null) {
          await db("recurring_events", "POST", {
            body: {
              user_id: userId,
              club_id: ev.club_id || null,
              dependant_id: ev.dependant_id || null,
              day_of_week: ev.day_of_week,
              start_time: ev.start_time || null,
              duration_minutes: ev.duration_minutes || 60,
              title: ev.title || null,
              excluded_dates: [],
              driver: null,
            },
          });
        } else if (ev.date) {
          await db("manual_events", "POST", {
            body: {
              user_id: userId,
              club_id: ev.club_id || null,
              dependant_id: ev.dependant_id || null,
              event_date: ev.date,
              start_time: ev.start_time || null,
              duration_minutes: ev.duration_minutes || 60,
              title: ev.title || null,
              driver: null,
            },
          });
        }
      }
    }
    if (result.fee) {
      await db("payment_reminders", "POST", {
        body: {
          user_id: userId,
          club_id: result.fee.club_id || null,
          dependant_id: result.fee.dependant_id || null,
          description: result.fee.description || "Fee",
          amount: result.fee.amount,
          due_date: result.fee.due_date,
          paid: false,
        },
      });
    }
    if (result.term && result.term.club_id) {
      await db("clubs", "PATCH", {
        body: {
          term_start: result.term.start_date,
          term_end: result.term.end_date,
        },
        filters: ["id=eq." + result.term.club_id],
      });
    }
    // Notify other adults in the family
    if (result.notifications?.length > 0 && profile?.family_id) {
      try {
        const famMembers = await db("profiles", "GET", {
          filters: [
            "family_id=eq." + profile.family_id,
            "id=neq." + userId,
          ],
        });
        for (const fm of famMembers || []) {
          if (fm.email) {
            await fetch(SB + "/functions/v1/send-invite", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken(),
              },
              body: JSON.stringify({
                to_email: fm.email,
                to_name: fm.first_name,
                from_name: profile?.first_name,
                email_type: "notification",
                site_url: "https://oneclubview.com",
                notification_text: result.notifications.join(". "),
              }),
            });
          }
        }
      } catch (e) {}
    }
    setApplying(false);
    onSaved();
  }

  const actionLabels = {
    schedule_update: "Schedule update",
    cancellation: "Cancellation",
    fee_due: "Fee notice",
    term_dates: "Term dates",
    general: "Message",
  };
  const actionIcons = {
    schedule_update: "\u{1F4C5}",
    cancellation: "\u{1F6AB}",
    fee_due: "\u{1F4B3}",
    term_dates: "\u{1F4C6}",
    general: "\u{1F4CB}",
  };

  const modalTitle = !result ? "Paste a message" : "Review changes";
  const modalFooter = !result ? (
    <button
      onClick={parse}
      disabled={parsing || !text.trim()}
      className="btn btn-primary"
    >
      {parsing ? "Reading message..." : "Read & extract"}
    </button>
  ) : (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={() => setResult(null)}
        className="btn btn-secondary"
        style={{ flex: 1 }}
      >
        Edit
      </button>
      <button
        onClick={apply}
        disabled={applying}
        className="btn btn-primary"
        style={{ flex: 2 }}
      >
        {applying ? "Applying..." : "Apply changes"}
      </button>
    </div>
  );

  return (
    <OcvModal
      open={true}
      onClose={onClose}
      title={modalTitle}
      footer={modalFooter}
    >
      {!result ? (
        <>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-muted)",
              marginBottom: 4,
              lineHeight: 1.5,
            }}
          >
            Paste a WhatsApp, email, or text from a coach or club. We'll
            figure out what it means.
          </p>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            {[
              "\u{1F4C5} Schedule",
              "\u{1F6AB} Cancellation",
              "\u{1F4B3} Fee notice",
              "\u{1F4C6} Term dates",
            ].map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-muted)",
                  background: "#f0eeeb",
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                {t}
              </span>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              "Paste the message here...\n\nExamples:\n\u2022 Hi parents, training Tues 5-6pm and Thurs 6-7pm\n\u2022 No class this Saturday due to pitch works\n\u2022 Fees for next term are \u20AC85, due by April 1st\n\u2022 Term 3 runs April 7 to June 20"
            }
            rows={7}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1.5px solid var(--color-border)",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              resize: "vertical",
            }}
          />
          {err && (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: "#fef2f2",
                color: "#dc2626",
                fontSize: 13,
                marginTop: 12,
              }}
            >
              {err}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Result display */}
          <div
            style={{
              background: "var(--color-primary-bg)",
              borderRadius: 14,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 20 }}>
                {actionIcons[result.action] || "\u{1F4CB}"}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--color-primary)",
                }}
              >
                {actionLabels[result.action] || "Update"}
              </span>
            </div>
            {result.summary && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-primary-light)",
                  lineHeight: 1.5,
                }}
              >
                {result.summary}
              </p>
            )}
          </div>

          {/* Events found */}
          {result.events?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Events ({result.events.length})
              </span>
              {result.events.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--color-card)",
                    borderRadius: 14,
                    border: "1px solid var(--color-border)",
                    padding: "10px 14px",
                    marginTop: 6,
                    boxShadow: "var(--shadow)",
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 28,
                      borderRadius: 2,
                      background: ev.cancelled
                        ? "#dc2626"
                        : "var(--color-accent)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: ev.cancelled
                          ? "line-through"
                          : "none",
                      }}
                    >
                      {ev.title || "Event"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-muted)",
                      }}
                    >
                      {ev.day_of_week != null
                        ? [
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                          ][ev.day_of_week]
                        : ev.date || ""}{" "}
                      {ev.start_time || ""}{" "}
                      {ev.duration_minutes
                        ? "(" + ev.duration_minutes + "min)"
                        : ""}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: ev.cancelled
                        ? "#fef2f2"
                        : "var(--color-primary-bg)",
                      color: ev.cancelled
                        ? "#dc2626"
                        : "var(--color-primary-light)",
                    }}
                  >
                    {ev.cancelled
                      ? "cancelled"
                      : ev.recurring
                      ? "weekly"
                      : "once"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Fee found */}
          {result.fee && (
            <div
              style={{
                background: "var(--color-accent-bg)",
                borderRadius: 14,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-accent)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Fee detected
              </span>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--color-primary)",
                  marginTop: 4,
                  fontFamily: "var(--font-serif)",
                }}
              >
                {'\u20AC'}{result.fee.amount}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                {result.fee.description}
                {result.fee.due_date ? " \u00B7 Due " + result.fee.due_date : ""}
              </div>
            </div>
          )}

          {/* Term found */}
          {result.term && (
            <div
              style={{
                background: "var(--color-primary-bg)",
                borderRadius: 14,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-primary-light)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Term dates
              </span>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  marginTop: 4,
                }}
              >
                {result.term.start_date} to {result.term.end_date}
              </div>
            </div>
          )}

          {/* Notifications */}
          {result.notifications?.length > 0 && (
            <div
              style={{
                background: "#fff7ed",
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
                border: "1px solid #fed7aa",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#c2410c",
                }}
              >
                Will notify other adults:
              </span>
              {result.notifications.map((n, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: "#9a3412",
                    marginTop: 4,
                  }}
                >
                  {n}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </OcvModal>
  );
}

export default PasteScheduleModal;
