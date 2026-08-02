const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

export function buildEmailHtml(params: {
  firstName: string;
  weekDates: Date[];
  events: Array<{ day: string; time: string; title: string; member: string }>;
  fees: Array<{ description: string; amount: number; due_date: string }>;
  suggestions: Array<{ title: string; distance: string; detail: string }>;
  weather: { code: number; tempMax: number } | null;
  satHasEvents: boolean;
  sunHasEvents: boolean;
  campAlerts: Array<{ kidName: string; holName: string; count: number }>;
  unsubscribeUrl: string;
}): string {
  const { firstName, weekDates, events, fees, suggestions, weather, satHasEvents, sunHasEvents, campAlerts, unsubscribeUrl } = params;

  const mon = weekDates[0];
  const sun = weekDates[6];
  const dateRange = `${formatDate(mon)} – ${formatDate(sun)}`;

  // --- Schedule table rows ---
  const scheduleRows = weekDates.map((date, i) => {
    const dayName = DAYS[i];
    const dayEvents = events.filter(e => e.day === dayName);
    const dateLabel = `${dayName}<br><span style="font-size:11px;color:#6b7280;">${formatDate(date)}</span>`;
    const isWeekend = i >= 5;
    const rowBg = isWeekend ? "#f0f4f8" : "#ffffff";

    let cellContent: string;
    if (dayEvents.length === 0) {
      cellContent = `<span style="color:#9ca3af;">—</span>`;
    } else {
      cellContent = dayEvents.map(e =>
        `<div style="margin-bottom:4px;">` +
        `<span style="font-weight:600;color:#1a2a3a;">${e.title}</span>` +
        `<span style="color:#6b7280;font-size:12px;"> · ${e.time}</span>` +
        `<br><span style="font-size:12px;color:#9ca3af;">${e.member}</span>` +
        `</div>`
      ).join("");
    }

    return `
      <tr style="background:${rowBg};">
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:13px;color:#374151;white-space:nowrap;vertical-align:top;width:110px;">${dateLabel}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:13px;vertical-align:top;">${cellContent}</td>
      </tr>`;
  }).join("");

  // --- Fees section ---
  let feesSection = "";
  if (fees.length > 0) {
    const feeRows = fees.map(f => {
      const due = new Date(f.due_date);
      const overdue = due < new Date();
      const dueTxt = overdue
        ? `<span style="color:#dc2626;font-weight:600;">Overdue (${formatDate(due)})</span>`
        : `Due ${formatDate(due)}`;
      return `
        <tr>
          <td style="padding:8px 14px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:13px;color:#374151;">${f.description}</td>
          <td style="padding:8px 14px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:13px;font-weight:600;color:#1a2a3a;white-space:nowrap;">€${f.amount.toFixed(2)}</td>
          <td style="padding:8px 14px;border-bottom:1px solid #e5e7eb;font-family:sans-serif;font-size:13px;">${dueTxt}</td>
        </tr>`;
    }).join("");

    feesSection = `
      <div style="margin:28px 0 0;">
        <h2 style="font-family:Georgia,serif;font-size:17px;color:#1a2a3a;margin:0 0 12px;padding:0 0 8px;border-bottom:2px solid #e85d4a;">
          Unpaid Fees
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 14px;text-align:left;font-family:sans-serif;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Description</th>
              <th style="padding:8px 14px;text-align:left;font-family:sans-serif;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Amount</th>
              <th style="padding:8px 14px;text-align:left;font-family:sans-serif;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Due</th>
            </tr>
          </thead>
          <tbody>${feeRows}</tbody>
        </table>
      </div>`;
  }

  // --- Weekend suggestions ---
  let suggestionsSection = "";
  const showSuggestions = (!satHasEvents || !sunHasEvents) && suggestions.length > 0;
  if (showSuggestions) {
    const weatherBadge = weather
      ? `<span style="font-size:22px;">${weatherIcon(weather.code)}</span> <span style="font-family:sans-serif;font-size:14px;color:#6b7280;">${Math.round(weather.tempMax)}°C weekend forecast</span>`
      : "";

    const suggCards = suggestions.map(s => `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:10px;">
        <div style="font-family:Georgia,serif;font-size:15px;font-weight:600;color:#1a2a3a;margin-bottom:4px;">${s.title}</div>
        <div style="font-family:sans-serif;font-size:12px;color:#e85d4a;margin-bottom:4px;">${s.distance}</div>
        <div style="font-family:sans-serif;font-size:13px;color:#374151;">${s.detail}</div>
      </div>`).join("");

    suggestionsSection = `
      <div style="margin:28px 0 0;">
        <h2 style="font-family:Georgia,serif;font-size:17px;color:#1a2a3a;margin:0 0 8px;padding:0 0 8px;border-bottom:2px solid #e85d4a;">
          Weekend Ideas
        </h2>
        <div style="margin-bottom:14px;">${weatherBadge}</div>
        ${suggCards}
      </div>`;
  }

  // --- Camp alerts ---
  let campAlertsSection = "";
  if (campAlerts.length > 0) {
    const alertItems = campAlerts.map(a =>
      `<li style="font-family:sans-serif;font-size:13px;color:#374151;margin-bottom:6px;">` +
      `<strong>${a.kidName}</strong> has no camp booked for <strong>${a.holName}</strong>` +
      (a.count > 0 ? ` — <a href="https://oneclubview.com" style="color:#e85d4a;">${a.count} option${a.count !== 1 ? "s" : ""} available</a>` : "") +
      `</li>`
    ).join("");

    campAlertsSection = `
      <div style="margin:28px 0 0;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:16px 18px;">
        <h2 style="font-family:Georgia,serif;font-size:16px;color:#c4960c;margin:0 0 10px;">Camp Reminders</h2>
        <ul style="margin:0;padding:0 0 0 18px;">${alertItems}</ul>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your week ahead — ${dateRange}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;color:#f3f4f6;font-size:1px;">
    Hi ${firstName} — here's your family schedule for ${dateRange} plus things to do this weekend.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#1a2a3a;border-radius:10px 10px 0 0;padding:28px 32px 24px;">
              <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">OneClubView</div>
              <div style="font-family:sans-serif;font-size:14px;color:#94a3b8;margin-top:4px;">Your week ahead — ${dateRange}</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:28px 32px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none;">

              <p style="font-family:sans-serif;font-size:15px;color:#374151;margin:0 0 22px;">Hi ${firstName},</p>

              <!-- Schedule -->
              <h2 style="font-family:Georgia,serif;font-size:17px;color:#1a2a3a;margin:0 0 12px;padding:0 0 8px;border-bottom:2px solid #e85d4a;">
                This Week's Schedule
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tbody>${scheduleRows}</tbody>
              </table>

              ${feesSection}
              ${campAlertsSection}
              ${suggestionsSection}

              <!-- CTA -->
              <div style="margin:32px 0 8px;text-align:center;">
                <a href="https://oneclubview.com" style="display:inline-block;background:#1a2a3a;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:8px;">
                  Open OneClubView
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;text-align:center;">
              <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;margin:0 0 6px;">
                OneClubView · Helping Irish families stay organised
              </p>
              <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;margin:0;">
                <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe from weekly digest</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
