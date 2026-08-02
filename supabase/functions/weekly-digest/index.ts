import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { buildEmailHtml } from "./email-template.ts";

function weekDates(): Date[] {
  const now = new Date();
  const day = now.getUTCDay();
  const daysToMon = day === 0 ? 1 : 8 - day;
  const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMon));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setUTCDate(mon.getUTCDate() + i);
    return d;
  });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const INDOOR_CATS = ["indoor", "cultural", "farm"];
const OUTDOOR_CATS = ["outdoor", "nature", "adventure", "beach", "playground", "water_sports", "cycling"];

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

function formatAMPM(timeStr: string | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")}${ampm}`;
}

serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const dates = weekDates();
  const monIso = isoDate(dates[0]);
  const sunIso = isoDate(dates[6]);
  const label = `${dates[0].toLocaleDateString("en-IE", { day: "numeric", month: "short" })} \u2013 ${dates[6].toLocaleDateString("en-IE", { day: "numeric", month: "short" })}`;

  // 1. Eligible users
  const { data: users, error: ue } = await sb
    .from("profiles")
    .select("id, first_name, email, family_id, latitude, longitude")
    .in("subscription_status", ["active", "trial", "trialing"])
    .neq("digest_opt_out", true)
    .not("email", "is", null);

  if (ue || !users?.length) {
    return new Response(JSON.stringify({ status: "no_users", error: ue?.message }), { headers: { "Content-Type": "application/json" } });
  }

  // Skip test emails
  const realUsers = users.filter((u: any) => !u.email?.includes("@example.com"));
  let sent = 0, failed = 0;

  for (const user of realUsers) {
    try {
      const uid = user.id as string;
      const name = (user.first_name as string) || "there";
      const email = user.email as string;
      const famId = user.family_id as string | null;

      // Family members
      let mids = [uid];
      if (famId) {
        const { data: fm } = await sb.from("profiles").select("id").eq("family_id", famId);
        if (fm) mids = fm.map((m: any) => m.id);
      }

      // Kids
      const { data: kidsRaw } = await sb.from("dependants").select("id, first_name, date_of_birth").in("parent_user_id", mids);
      const kids = (kidsRaw || []) as Array<{ id: string; first_name: string; date_of_birth: string }>;
      const kidMap = new Map(kids.map(k => [k.id, k]));

      // Clubs
      const { data: subsRaw } = await sb.from("hub_subscriptions").select("club_id, nickname, clubs(name)").in("user_id", mids);
      const clubNames: Record<string, string> = {};
      ((subsRaw || []) as any[]).forEach(s => { clubNames[s.club_id] = s.nickname || s.clubs?.name || "Club"; });

      // Recurring events — day_of_week is int (0=Sun, 1=Mon, ..., 6=Sat)
      const { data: recsRaw } = await sb.from("recurring_events").select("day_of_week, start_time, title, club_id, dependant_id").in("user_id", mids).eq("active", true);

      // Manual events
      const { data: mansRaw } = await sb.from("manual_events").select("event_date, title, club_id, dependant_id").in("user_id", mids).gte("event_date", monIso).lte("event_date", sunIso + "T23:59:59");

      // Build events
      const events: Array<{ day: string; time: string; title: string; member: string }> = [];
      for (const r of (recsRaw || []) as any[]) {
        dates.forEach(d => {
          if (d.getUTCDay() === r.day_of_week) {
            const dStr = isoDate(d);
            const kid = r.dependant_id ? kidMap.get(r.dependant_id) : null;
            events.push({
              day: DAY_NAMES[d.getUTCDay()],
              time: formatAMPM(r.start_time),
              title: r.title || clubNames[r.club_id] || "Activity",
              member: kid?.first_name || name,
            });
          }
        });
      }
      for (const m of (mansRaw || []) as any[]) {
        const d = new Date(m.event_date);
        const kid = m.dependant_id ? kidMap.get(m.dependant_id) : null;
        events.push({
          day: DAY_NAMES[d.getUTCDay()],
          time: formatAMPM(d.toTimeString().slice(0, 5)),
          title: m.title || clubNames[m.club_id] || "Event",
          member: kid?.first_name || name,
        });
      }

      // Fees
      const { data: feesRaw } = await sb.from("payment_reminders").select("description, amount, due_date").in("user_id", mids).eq("paid", false).neq("status", "not_renewing");
      const fees = (feesRaw || []) as Array<{ description: string; amount: number; due_date: string }>;

      // Weather
      let weather: { code: number; tempMax: number } | null = null;
      const lat = Number(user.latitude) || 53.35;
      const lng = Number(user.longitude) || -6.26;
      try {
        const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max&timezone=Europe%2FDublin&forecast_days=7`);
        if (wx.ok) {
          const j = await wx.json();
          const satIso = isoDate(dates[5]);
          const idx = (j.daily?.time || []).indexOf(satIso);
          if (idx !== -1) weather = { code: j.daily.weathercode[idx], tempMax: j.daily.temperature_2m_max[idx] };
        }
      } catch { /* weather is optional */ }

      // Weekend suggestions
      const satHas = events.some(e => e.day === "Saturday");
      const sunHas = events.some(e => e.day === "Sunday");
      let suggestions: Array<{ title: string; distance: string; detail: string }> = [];

      if (!satHas || !sunHas) {
        const isRainy = weather !== null && weather.code >= 51;
        const ages = kids.map(k => Math.floor((Date.now() - new Date(k.date_of_birth).getTime()) / (365.25 * 86400000))).filter(a => a > 0);
        const minAge = ages.length ? Math.min(...ages) : 0;
        const maxAge = ages.length ? Math.max(...ages) : 99;

        const { data: ttd } = await sb.from("things_to_do").select("title, category, latitude, longitude, cost_eur, age_min, age_max, location_name").eq("status", "active").limit(100);

        if (ttd && ttd.length > 0) {
          const scored = (ttd as any[])
            .filter(t => (!t.age_min || t.age_min <= maxAge) && (!t.age_max || t.age_max >= minAge))
            .map(t => {
              const d = t.latitude && t.longitude ? haversineKm(lat, lng, Number(t.latitude), Number(t.longitude)) : 999;
              const wm = isRainy ? INDOOR_CATS.includes(t.category) : OUTDOOR_CATS.includes(t.category);
              return { ...t, dist: d, weatherMatch: wm };
            })
            .filter(t => t.dist <= 25)
            .sort((a, b) => { if (a.weatherMatch !== b.weatherMatch) return a.weatherMatch ? -1 : 1; return a.dist - b.dist; })
            .slice(0, 3);

          suggestions = scored.map(t => ({
            title: t.title,
            distance: `${t.dist.toFixed(0)}km`,
            detail: [t.age_min || t.age_max ? `Ages ${t.age_min || "?"}-${t.age_max || "?"}` : null, t.cost_eur ? `\u20AC${t.cost_eur}` : "Free", t.category].filter(Boolean).join(" \u00B7 "),
          }));
        }
      }

      // Camp alerts
      const campAlerts: Array<{ kidName: string; holName: string; count: number }> = [];
      const { data: hols } = await sb.from("school_holidays").select("name, start_date, end_date").gte("end_date", monIso).order("start_date");
      if (hols) {
        for (const h of hols as any[]) {
          const away = (new Date(h.start_date).getTime() - Date.now()) / 86400000;
          if (away > 21 || away < 0) continue;
          for (const kid of kids) {
            const { count } = await sb.from("camp_bookings").select("id", { count: "exact", head: true }).eq("dependant_id", kid.id);
            if (!count) campAlerts.push({ kidName: kid.first_name, holName: h.name || "school holiday", count: 0 });
          }
        }
      }

      // Build + send
      const unsub = `${supabaseUrl}/functions/v1/digest-unsubscribe?uid=${uid}`;
      const html = buildEmailHtml({ firstName: name, weekDates: dates, events, fees, suggestions, weather, satHasEvents: satHas, sunHasEvents: sunHas, campAlerts, unsubscribeUrl: unsub });

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "OneClubView <hello@oneclubview.com>", to: email, subject: `Your week ahead \u2014 ${label}`, html }),
      });

      const body = await resp.json().catch(() => ({}));
      await sb.from("email_queue").insert({
        user_id: uid, email_to: email, email_key: "weekly_digest",
        subject: `Your week ahead \u2014 ${label}`,
        status: resp.status === 200 ? "sent" : "failed",
        error: resp.status !== 200 ? JSON.stringify(body) : null,
        sent_at: resp.status === 200 ? new Date().toISOString() : null,
      }).catch(() => {});

      if (resp.status === 200) sent++; else { failed++; console.error(`Resend failed for ${email}:`, body); }
    } catch (e) { console.error(`Digest error for ${user.id}:`, e); failed++; }
  }

  return new Response(JSON.stringify({ status: "done", sent, failed }), { headers: { "Content-Type": "application/json" } });
});
