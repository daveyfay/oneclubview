import React, { useState } from 'react';

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
          Authorization: "Bearer " + _t,
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
                Authorization: "Bearer " + _t,
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
    schedule_update: "📅",
    cancellation: "🚫",
    fee_due: "💳",
    term_dates: "📆",
    general: "📋",
  };

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
            Paste a message
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

        {!result ? (
          <>
            <p
              style={{
                fontSize: 13,
                color: "var(--mt)",
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
                "📅 Schedule",
                "🚫 Cancellation",
                "💳 Fee notice",
                "📆 Term dates",
              ].map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--mt)",
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
                "Paste the message here...\n\nExamples:\n• Hi parents, training Tues 5-6pm and Thurs 6-7pm\n• No class this Saturday due to pitch works\n• Fees for next term are €85, due by April 1st\n• Term 3 runs April 7 to June 20"
              }
              rows={7}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1.5px solid var(--bd)",
                fontSize: 13,
                fontFamily: "var(--sn)",
                resize: "vertical",
                marginBottom: 12,
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
                  marginBottom: 12,
                }}
              >
                {err}
              </div>
            )}
            <button
              onClick={parse}
              disabled={parsing || !text.trim()}
              className="btn bp"
            >
              {parsing ? "Reading message..." : "Read & extract"}
            </button>
          </>
        ) : (
          <>
            {/* Result display */}
            <div
              style={{
                background: "var(--gxl)",
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
                  {actionIcons[result.action] || "📋"}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--g)",
                  }}
                >
                  {actionLabels[result.action] || "Update"}
                </span>
              </div>
              {result.summary && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--gl)",
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
                    color: "var(--mt)",
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
                      background: "var(--card)",
                      borderRadius: 14,
                      border: "1px solid var(--bd)",
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
                          : "var(--acc)",
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
                          color: "var(--mt)",
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
                          : "var(--gxl)",
                        color: ev.cancelled
                          ? "#dc2626"
                          : "var(--gl)",
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
                  background: "var(--accl)",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--acc)",
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
                    color: "var(--g)",
                    marginTop: 4,
                    fontFamily: "var(--sr)",
                  }}
                >
                  €{result.fee.amount}
                </div>
                <div style={{ fontSize: 12, color: "var(--mt)" }}>
                  {result.fee.description}
                  {result.fee.due_date ? " · Due " + result.fee.due_date : ""}
                </div>
              </div>
            )}

            {/* Term found */}
            {result.term && (
              <div
                style={{
                  background: "var(--gxl)",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--gl)",
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
                    color: "var(--g)",
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

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setResult(null)}
                className="btn bs"
                style={{ flex: 1 }}
              >
                Edit
              </button>
              <button
                onClick={apply}
                disabled={applying}
                className="btn bp"
                style={{ flex: 2 }}
              >
                {applying ? "Applying..." : "Apply changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PasteScheduleModal;
