import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_KEY') || '';
const SB_URL = 'https://uqihwazheypvmrcrqklg.supabase.co';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const sbH = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const m = String(v).match(/(\d+\.?\d*)/);
  return m ? parseFloat(m[1]) : null;
}
function toInt(v: any, fb: number | null = null): number | null {
  const n = toNum(v); return n !== null ? Math.round(n) : fb;
}
function normCampType(raw: string): string {
  if (!raw) return 'multi_activity'; const l = raw.toLowerCase();
  if (/sport|gaa|swim|rugby|soccer|tennis|gymnast|athlet|hurling|football|hockey/.test(l)) return 'sport';
  if (/stem|tech|code|robot|science/.test(l)) return 'stem';
  if (/art|craft|paint|draw/.test(l)) return 'arts';
  if (/drama|theatre|act|musical/.test(l)) return 'drama';
  if (/music|band|sing/.test(l)) return 'music';
  if (/outdoor|adventure|forest|nature|kayak|surf|sail|climb/.test(l)) return 'outdoor';
  return 'multi_activity';
}
function extractJSON(text: string): any {
  const f = text.indexOf('['), l = text.lastIndexOf(']');
  if (f !== -1 && l !== -1) return JSON.parse(text.substring(f, l + 1));
  const f2 = text.indexOf('{'), l2 = text.lastIndexOf('}');
  if (f2 === -1 || l2 === -1) throw new Error('No JSON found');
  return JSON.parse(text.substring(f2, l2 + 1));
}
function parseDate(v: any, offset: number = 0): string {
  if (v && /^\d{4}-\d{2}-\d{2}/.test(String(v))) return String(v).substring(0,10);
  if (v) { const m = String(v).match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`; }
  return new Date().getMonth() < 5 ? `2026-04-${String(6+offset).padStart(2,'0')}` : `2026-07-${String(1+offset).padStart(2,'0')}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  try {
    const body = await req.json().catch(() => ({}));
    const providerId = body.provider_id;

    // Fetch provider(s)
    let providers: any[] = [];
    if (providerId) {
      const r = await fetch(`${SB_URL}/rest/v1/camp_providers?id=eq.${providerId}&select=*`, { headers: sbH });
      providers = await r.json();
    } else {
      // Scrape all providers
      const r = await fetch(`${SB_URL}/rest/v1/camp_providers?select=*&order=name.asc`, { headers: sbH });
      providers = await r.json();
    }

    const results: any[] = [];

    for (const prov of providers) {
      try {
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001', max_tokens: 8000,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages: [{ role: 'user', content: `You are a data extraction bot. Search the website ${prov.website} for ALL their camp locations in Ireland for 2026 (Easter and Summer).

For each camp location found, extract:
- venue/location name (e.g. "Blackrock College", "Wesley College")
- town (e.g. "Blackrock", "Ballinteer")
- county
- approximate latitude and longitude of the venue
- dates (start_date, end_date) as YYYY-MM-DD
- daily times (start_time, end_time)
- age range (age_min, age_max) — numbers only
- cost in EUR — number only
- booking URL if available
- whether it's Easter or Summer

Return ONLY a JSON array. No text before or after.
[{"venue": "", "town": "", "county": "", "latitude": 53.0, "longitude": -6.0, "start_date": "2026-03-30", "end_date": "2026-04-02", "start_time": "09:00", "end_time": "15:00", "age_min": 4, "age_max": 12, "cost_eur": 120, "booking_url": "", "season": "easter"}]` }]
          })
        });

        if (!aiRes.ok) { results.push({ provider: prov.name, error: `AI ${aiRes.status}` }); continue; }
        const aiData = await aiRes.json();
        let text = '';
        for (const block of aiData.content || []) { if (block.type === 'text') text += block.text; }
        if (!text.trim()) { results.push({ provider: prov.name, error: 'empty response' }); continue; }

        let camps: any[];
        try {
          const parsed = extractJSON(text);
          camps = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) { results.push({ provider: prov.name, error: `parse: ${(e as Error).message}` }); continue; }

        let inserted = 0;
        for (const c of camps) {
          if (!c.venue && !c.town) continue;
          const title = `${prov.name} - ${c.town || c.venue}`;
          const sd = parseDate(c.start_date, 0), ed = parseDate(c.end_date, 4);
          const lat = toNum(c.latitude), lng = toNum(c.longitude);
          if (!lat || !lng) continue;

          // Dedup by title + start_date
          const ex = await fetch(`${SB_URL}/rest/v1/camps?title=eq.${encodeURIComponent(title)}&start_date=eq.${sd}&select=id`, { headers: sbH });
          if ((await ex.json())?.length > 0) continue;

          const r = await fetch(`${SB_URL}/rest/v1/camps`, { method: 'POST', headers: sbH, body: JSON.stringify({
            title, camp_type: normCampType(prov.camp_type || ''), start_date: sd, end_date: ed,
            daily_start_time: c.start_time || null, daily_end_time: c.end_time || null,
            age_min: toInt(c.age_min, 4), age_max: toInt(c.age_max, 14), cost_eur: toNum(c.cost_eur),
            location_name: c.venue || c.town, location_address: `${c.town || ''}, ${c.county || 'Ireland'}`,
            latitude: lat, longitude: lng, booking_url: c.booking_url || prov.website,
            source: 'provider_scrape', status: 'active'
          }) });
          if (r.ok) inserted++;
        }

        // Update last scraped
        await fetch(`${SB_URL}/rest/v1/camp_providers?id=eq.${prov.id}`, {
          method: 'PATCH', headers: sbH,
          body: JSON.stringify({ last_scraped_at: new Date().toISOString() })
        });

        results.push({ provider: prov.name, found: camps.length, inserted });
      } catch (e) {
        results.push({ provider: prov.name, error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ status: 'done', results }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
