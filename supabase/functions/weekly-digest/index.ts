import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { buildEmailHtml } from "./email-template.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the Mon–Sun Date array for the NEXT calendar week. */
function weekDates(): Date[] {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  // Days until next Monday (if today is Sunday, that's 1 day ahead)
  const daysToMon = day === 0 ? 1 : 8 - day;
  const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMon));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setUTCDate(mon.getUTCDate() + i);
    return d;
  });
}

/** Haversine distance in km between two lat/lng points. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatAMPM(timeStr: string): string {
  // timeStr may be "09:00:00" or "09:00"
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const dates = weekDates();
  const monIso = isoDate(dates[0]);
  const sunIso = isoDate(dates[6]);
  const dateRangeLabel = `${dates[0].toLocaleDateString("en-IE", { day: "numeric", month: "short" })} – ${dates[6].toLocaleDateString("en-IE", { day: "numeric", month: "short" })}`;

  // 1. Fetch eligible users
  const { data: users, error: usersErr } = await supabase
    .from("profiles")
    .select("id, first_name, email, subscription_status, family_id, digest_opt_out")
    .in("subscription_status", ["active", "trialing"])
    .neq("digest_opt_out", true)
    .not("email", "is", null);

  if (usersErr || !users?.length) {
    console.error("weekly-digest: failed to fetch users or none eligible", usersErr);
    return new Response(JSON.stringify({ status: "no_users", error: usersErr?.message }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const userId = user.id as string;
      const firstName = (user.first_name as string) || "there";
      const userEmail = user.email as string;
      const familyId = user.family_id as string | null;

      // -----------------------------------------------------------------------
      // 2a. Recurring events for the week
      // -----------------------------------------------------------------------
      const weekdayNames = dates.map(d => DAY_NAMES[d.getUTCDay()]);

      // Fetch for this user and (if family exists) all family members
      let memberIds: string[] = [userId];
      if (familyId) {
        const { data: familyMembers } = await supabase
          .from("profiles")
          .select("id")
          .eq("family_id", familyId);
        if (familyMembers) memberIds = familyMembers.map((m: { id: string }) => m.id);
      }

      const { data: recurringRaw } = await supabase
        .from("recurring_events")
        .select("day_of_week, start_time, title, member_name, user_id")
        .in("user_id", memberIds)
        .in("day_of_week", weekdayNames);

      // -----------------------------------------------------------------------
      // 2b. Manual (one-off) events for Mon–Sun
      // -----------------------------------------------------------------------
      const { data: manualRaw } = await supabase
        .from("manual_events")
        .select("event_date, start_time, title, member_name, user_id")
        .in("user_id", memberIds)
        .gte("event_date", monIso)
        .lte("event_date", sunIso);

      const events: Array<{ day: string; time: string; title: string; member: string }> = [];

      for (const r of (recurringRaw ?? [])) {
        events.push({
          day: r.day_of_week as string,
          time: formatAMPM(r.start_time as string),
          title: r.title as string,
          member: (r.member_name as string) || "",
        });
      }

      for (const m of (manualRaw ?? [])) {
        const d = new Date(m.event_date as string);
        events.push({
          day: DAY_NAMES[d.getUTCDay()],
          time: formatAMPM(m.start_time as string),
          title: m.title as string,
          member: (m.member_name as string) || "",
        });
      }

      // -----------------------------------------------------------------------
      // 3. Unpaid fees
      // -----------------------------------------------------------------------
      const { data: feesRaw } = await supabase
        .from("payment_reminders")
        .select("description, amount, due_date, paid")
        .in("user_id", memberIds)
        .neq("paid", true);

      const fees = (feesRaw ?? []).map((f: { description: string; amount: number; due_date: string }) => ({
        description: f.description,
        amount: f.amount,
        due_date: f.due_date,
      }));

      // -----------------------------------------------------------------------
      // 4. Weather forecast (Open-Meteo, free — no API key)
      // -----------------------------------------------------------------------
      let weather: { code: number; tempMax: number } | null = null;
      let userLat: number | null = null;
      let userLng: number | null = null;

      const { data: locRow } = await supabase
        .from("family_locations")
        .select("latitude, longitude")
        .eq("user_id", userId)
        .eq("label", "Home")
        .maybeSingle();

      if (locRow?.latitude && locRow?.longitude) {
        userLat = locRow.latitude as number;
        userLng = locRow.longitude as number;
        try {
          const wxUrl =
            `https://api.open-meteo.com/v1/forecast?latitude=${userLat}&longitude=${userLng}` +
            `&daily=weathercode,temperature_2m_max&timezone=Europe%2FDublin&forecast_days=7`;
          const wxResp = await fetch(wxUrl);
          if (wxResp.ok) {
            const wxJson = await wxResp.json();
            // Find Saturday index in the forecast (dates[5] = next Saturday)
            const satIso = isoDate(dates[5]);
            const fcastDates: string[] = wxJson.daily?.time ?? [];
            const satIdx = fcastDates.indexOf(satIso);
            if (satIdx !== -1) {
              weather = {
                code: wxJson.daily.weathercode[satIdx] as number,
                tempMax: wxJson.daily.temperature_2m_max[satIdx] as number,
              };
            }
          }
        } catch (wxErr) {
          console.warn("weekly-digest: weather fetch failed", wxErr);
        }
      }

      // -----------------------------------------------------------------------
      // 5. Weekend suggestions from things_to_do
      // -----------------------------------------------------------------------
      const satHasEvents = events.some(e => e.day === "Saturday");
      const sunHasEvents = events.some(e => e.day === "Sunday");
      const needsSuggestions = !satHasEvents || !sunHasEvents;

      let suggestions: Array<{ title: string; distance: string; detail: string }> = [];

      if (needsSuggestions) {
        // Bias indoor if rainy (weather code >= 51)
        const isRainy = weather !== null && weather.code >= 51;

        // Fetch kids' ages
        const { data: kidsRaw } = await supabase
          .from("dependants")
          .select("date_of_birth")
          .in("parent_user_id", memberIds);

        const now = new Date();
        const kidAges = (kidsRaw ?? []).map((k: { date_of_birth: string }) => {
          const dob = new Date(k.date_of_birth);
          return Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
        });
        const minAge = kidAges.length > 0 ? Math.min(...kidAges) : 0;
        const maxAge = kidAges.length > 0 ? Math.max(...kidAges) : 99;

        let query = supabase
          .from("things_to_do")
          .select("title, description, latitude, longitude, min_age, max_age, indoor")
          .gte("max_age", minAge)
          .lte("min_age", maxAge)
          .limit(50);

        if (isRainy) {
          query = query.eq("indoor", true);
        }

        const { data: thingsRaw } = await query;

        if (thingsRaw && thingsRaw.length > 0) {
          // Sort by distance from home if we have coords, otherwise random
          type ThingRow = {
            title: string;
            description: string;
            latitude: number | null;
            longitude: number | null;
            min_age: number;
            max_age: number;
            indoor: boolean;
          };

          let sorted: ThingRow[] = thingsRaw as ThingRow[];

          if (userLat !== null && userLng !== null) {
            sorted = sorted.sort((a, b) => {
              const distA = a.latitude && a.longitude ? haversineKm(userLat!, userLng!, a.latitude, a.longitude) : 9999;
              const distB = b.latitude && b.longitude ? haversineKm(userLat!, userLng!, b.latitude, b.longitude) : 9999;
              return distA - distB;
            });
          }

          suggestions = sorted.slice(0, 3).map(t => {
            const dist =
              userLat !== null && userLng !== null && t.latitude && t.longitude
                ? `${haversineKm(userLat, userLng, t.latitude, t.longitude).toFixed(1)} km away`
                : "";
            return {
              title: t.title,
              distance: dist,
              detail: t.description || "",
            };
          });
        }
      }

      // -----------------------------------------------------------------------
      // 6. Camp alerts — kids with no camp in upcoming school holidays
      // -----------------------------------------------------------------------
      const campAlerts: Array<{ kidName: string; holName: string; count: number }> = [];

      // Check for upcoming school holiday periods in next 8 weeks
      const eightWeeksOut = new Date(dates[0]);
      eightWeeksOut.setDate(eightWeeksOut.getDate() + 56);

      const { data: holidays } = await supabase
        .from("user_school_holidays")
        .select("holiday_name, start_date, end_date")
        .eq("user_id", userId)
        .gte("start_date", monIso)
        .lte("start_date", isoDate(eightWeeksOut));

      if (holidays && holidays.length > 0) {
        const { data: kids } = await supabase
          .from("dependants")
          .select("id, name")
          .eq("parent_user_id", userId);

        for (const hol of holidays as Array<{ holiday_name: string; start_date: string; end_date: string }>) {
          for (const kid of (kids ?? []) as Array<{ id: string; name: string }>) {
            const { data: bookings } = await supabase
              .from("camp_bookings")
              .select("id")
              .eq("dependant_id", kid.id)
              .gte("camp_start_date", hol.start_date)
              .lte("camp_start_date", hol.end_date)
              .limit(1);

            if (!bookings || bookings.length === 0) {
              // Count available camps during this holiday
              const { count: campCount } = await supabase
                .from("camps")
                .select("id", { count: "exact", head: true })
                .gte("start_date", hol.start_date)
                .lte("start_date", hol.end_date);

              campAlerts.push({
                kidName: kid.name,
                holName: hol.holiday_name,
                count: campCount ?? 0,
              });
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // 7. Build unsubscribe URL
      // -----------------------------------------------------------------------
      const unsubscribeUrl = `${supabaseUrl}/functions/v1/digest-unsubscribe?uid=${userId}`;

      // -----------------------------------------------------------------------
      // 8. Render email
      // -----------------------------------------------------------------------
      const html = buildEmailHtml({
        firstName,
        weekDates: dates,
        events,
        fees,
        suggestions,
        weather,
        satHasEvents,
        sunHasEvents,
        campAlerts,
        unsubscribeUrl,
      });

      // -----------------------------------------------------------------------
      // 9. Send via Resend
      // -----------------------------------------------------------------------
      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "OneClubView <hello@oneclubview.com>",
          to: userEmail,
          subject: `Your week ahead — ${dateRangeLabel}`,
          html,
        }),
      });

      const resendStatus = resendResp.status;
      const resendBody = await resendResp.json().catch(() => ({}));

      // -----------------------------------------------------------------------
      // 10. Log to email_queue
      // -----------------------------------------------------------------------
      await supabase.from("email_queue").insert({
        user_id: userId,
        email_type: "weekly_digest",
        recipient: userEmail,
        subject: `Your week ahead — ${dateRangeLabel}`,
        status: resendStatus === 200 ? "sent" : "failed",
        resend_id: (resendBody as { id?: string }).id ?? null,
        error: resendStatus !== 200 ? JSON.stringify(resendBody) : null,
        sent_at: new Date().toISOString(),
      });

      if (resendStatus === 200) {
        sent++;
      } else {
        console.error(`weekly-digest: Resend failed for ${userEmail}`, resendBody);
        failed++;
      }
    } catch (userErr) {
      console.error(`weekly-digest: error processing user ${user.id}`, userErr);
      failed++;
    }
  }

  console.log(`weekly-digest complete: ${sent} sent, ${failed} failed`);
  return new Response(JSON.stringify({ status: "done", sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
