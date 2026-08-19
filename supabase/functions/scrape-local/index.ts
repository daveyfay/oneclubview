import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_KEY') || '';
const SB_URL = 'https://uqihwazheypvmrcrqklg.supabase.co';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const sbH = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

const RATE_LIMIT = 5;
const RATE_WINDOW_HOURS = 1;

async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - RATE_WINDOW_HOURS * 3600000).toISOString();
    const res = await fetch(`${SB_URL}/rest/v1/rate_limits?endpoint=eq.scrape-local&ip_address=eq.${encodeURIComponent(ip)}&called_at=gte.${since}&select=id`, { headers: sbH });
    const rows = await res.json();
    if (rows?.length >= RATE_LIMIT) return false;
    await fetch(`${SB_URL}/rest/v1/rate_limits`, { method: 'POST', headers: sbH, body: JSON.stringify({ endpoint: 'scrape-local', ip_address: ip }) });
    fetch(`${SB_URL}/rest/v1/rpc/cleanup_rate_limits`, { method: 'POST', headers: sbH }).catch(() => {});
    return true;
  } catch { return true; }
}

async function log(step: string, data: string) {
  await fetch(`${SB_URL}/rest/v1/scrape_debug`, { method: 'POST', headers: sbH, body: JSON.stringify({ step, data: data.substring(0, 2000) }) }).catch(() => {});
}
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.asin(Math.sqrt(a));
}
function extractJSON(text: string): any {
  const f = text.indexOf('{'), l = text.lastIndexOf('}');
  if (f === -1 || l === -1) throw new Error('No JSON found');
  return JSON.parse(text.substring(f, l + 1));
}
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
  if (/sport|gaa|swim|rugby|soccer|tennis|gymnast|athlet|hurling|football|hockey|basketball|cricket/.test(l)) return 'sport';
  if (/stem|tech|code|robot|science/.test(l)) return 'stem'; if (/art|craft|paint|draw|perform/.test(l)) return 'arts';
  if (/drama|theatre|act|musical/.test(l)) return 'drama'; if (/music|band|sing/.test(l)) return 'music';
  if (/outdoor|adventure|forest|nature|kayak|surf|sail|climb/.test(l)) return 'outdoor';
  if (/language|irish|french|gaeltacht/.test(l)) return 'language'; return 'multi_activity';
}
function normThingCat(raw: string): string {
  if (!raw) return 'outdoor'; const l = raw.toLowerCase();
  if (/indoor|play.?centre|bowling|cinema|soft.?play/.test(l)) return 'indoor'; if (/beach|coast|sea|bay/.test(l)) return 'beach';
  if (/nature|garden|walk|hike|forest|park|waterfall|lake/.test(l)) return 'nature'; if (/adventure|zip|climb|ropes|treetop|aqua/.test(l)) return 'adventure';
  if (/farm|animal|zoo|pet|aquarium/.test(l)) return 'farm'; if (/museum|castle|heritage|history|cultural|house/.test(l)) return 'cultural';
  if (/water|kayak|surf|paddle|boat|sail/.test(l)) return 'water_sports'; if (/cycle|bike|greenway/.test(l)) return 'cycling';
  if (/playground|swing|slide/.test(l)) return 'playground'; return 'outdoor';
}
function parseDate(v: any, offset: number = 0): string {
  if (v && /^\d{4}-\d{2}-\d{2}/.test(String(v))) return String(v).substring(0,10);
  if (v) { const m = String(v).match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`; }
  return new Date().getMonth() < 5 ? `2026-04-${String(6+offset).padStart(2,'0')}` : `2026-07-${String(1+offset).padStart(2,'0')}`;
}

interface GeoResult { placeName: string; country: string; currency: string; county: string; }

async function reverseGeocode(lat: number, lng: number): Promise<GeoResult> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`, { headers: { 'User-Agent': 'OneClubView/1.0' } });
    const data = await res.json(); const addr = data.address || {};
    const town = addr.town || addr.city || addr.village || addr.suburb || addr.hamlet || '';
    const county = addr.county || addr.state || '';
    const country = addr.country || '';
    const countryCode = (addr.country_code || '').toLowerCase();
    const currency = (countryCode === 'gb') ? 'GBP' : 'EUR';
    let placeName = '';
    if (town && county) placeName = `${town}, ${county}, ${country}`;
    else if (county) placeName = `${county}, ${country}`;
    else placeName = data.display_name?.split(',').slice(0,3).join(',') || `${lat},${lng}`;
    return { placeName, country, currency, county };
  } catch { return { placeName: `${lat},${lng}`, country: '', currency: 'EUR', county: '' }; }
}

async function scrapeWithRetry(latitude: number, longitude: number, placeName: string, currency: string): Promise<any> {
  const currencyLabel = currency === 'GBP' ? 'GBP (\u00a3)' : 'EUR (\u20ac)';
  for (let attempt = 1; attempt <= 2; attempt++) {
    await log(`ai_${attempt}`, `calling haiku for ${placeName} (${currency})`);
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 8000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: `You are a data extraction bot. The user is in ${placeName} (${latitude}, ${longitude}).

IMPORTANT: Only return results that are ACTUALLY IN or very near ${placeName}. Do NOT include results from other cities or counties.
Currency for this region: ${currencyLabel}

Search for:
1. Easter/Summer camps for children in ${placeName} area (within 15km only)
2. Kids activity clubs ACTUALLY LOCATED in ${placeName} area (within 15km only) \u2014 sports, arts, music, swimming, GAA, rugby, soccer, dance, drama, coding, scouts, guides, martial arts
3. Family things to do \u2014 attractions, parks, playgrounds, farms, beaches near ${placeName}
4. Primary schools (and secondary schools) in ${placeName} area (within 10km) \u2014 include the school type (primary/secondary/special) and ethos (Catholic/Church of Ireland/Educate Together/Multidenominational/etc) if known

For EVERY result, include approximate latitude and longitude of WHERE IT IS LOCATED (not the user's location).

End with JSON only. Numbers only for ages/costs in ${currencyLabel}. null if unknown.

{"area_name": "${placeName}",
 "country": "",
 "currency": "${currency}",
 "camps": [{"title": "", "camp_type": "", "start_date": "2026-04-06", "end_date": "2026-04-10", "age_min": 4, "age_max": 14, "cost": 100, "location_name": "", "location_address": "", "latitude": 0, "longitude": 0, "booking_url": ""}],
 "clubs": [{"name": "", "category": "", "website_url": "", "location": "", "address": "", "latitude": 0, "longitude": 0}],
 "things_to_do": [{"title": "", "description": "", "category": "", "age_min": 0, "age_max": 99, "audience": "family", "cost": 10, "location_name": "", "location_address": "", "latitude": 0, "longitude": 0, "website_url": "", "seasonal": false}],
 "schools": [{"name": "", "address": "", "school_type": "primary", "ethos": "", "website": "", "latitude": 0, "longitude": 0}]}` }]
      })
    });
    if (!aiRes.ok) { await log(`ai_err_${attempt}`, `${aiRes.status}`); continue; }
    const aiData = await aiRes.json();
    let resultText = '';
    for (const block of aiData.content || []) { if (block.type === 'text') resultText += block.text; }
    if (!resultText.trim()) continue;
    try {
      const parsed = extractJSON(resultText);
      if (parsed.area_name) return parsed;
    } catch (e) { await log(`parse_err_${attempt}`, (e as Error).message); }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      await log('rate_limited', `IP ${ip} exceeded ${RATE_LIMIT} calls/hour`);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.', status: 'rate_limited' }), { status: 429, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Retry-After': '3600' } });
    }

    const { latitude, longitude } = await req.json();
    if (!latitude || !longitude) return new Response(JSON.stringify({ error: 'lat/lng required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    const geo = await reverseGeocode(latitude, longitude);
    const placeName = geo.placeName;
    const currency = geo.currency;
    await log('start', `lat=${latitude} lng=${longitude} place=${placeName} currency=${currency} ip=${ip}`);

    const regionsRes = await fetch(`${SB_URL}/rest/v1/scrape_regions?select=*`, { headers: sbH });
    const regions = await regionsRes.json() || [];
    const nearby = regions.find((r: any) => haversineKm(latitude, longitude, r.latitude, r.longitude) < 15);
    if (nearby?.last_scraped_at) {
      const hrs = (Date.now() - new Date(nearby.last_scraped_at).getTime()) / 3600000;
      if (hrs < 24) return new Response(JSON.stringify({ status: 'cached', region_name: nearby.region_name, camp_count: nearby.camp_count, club_count: nearby.club_count }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const parsed = await scrapeWithRetry(latitude, longitude, placeName, currency);
    if (!parsed) return new Response(JSON.stringify({ status: 'no_results' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

    const areaName = parsed.area_name || placeName;
    const camps = parsed.camps || [], clubs = parsed.clubs || [], things = parsed.things_to_do || [], schools = parsed.schools || [];
    await log('parsed', `area=${areaName} camps=${camps.length} clubs=${clubs.length} things=${things.length} schools=${schools.length}`);

    let regionId: string | null = nearby?.id || null;
    if (nearby) {
      await fetch(`${SB_URL}/rest/v1/scrape_regions?id=eq.${nearby.id}`, { method: 'PATCH', headers: sbH, body: JSON.stringify({ last_scraped_at: new Date().toISOString(), camp_count: camps.length, club_count: clubs.length, region_name: areaName }) });
    } else {
      const rr = await fetch(`${SB_URL}/rest/v1/scrape_regions`, { method: 'POST', headers: sbH, body: JSON.stringify({ latitude, longitude, region_name: areaName, last_scraped_at: new Date().toISOString(), camp_count: camps.length, club_count: clubs.length }) });
      try { regionId = (await rr.json())?.[0]?.id; } catch {}
    }

    // INSERT CAMPS
    let ci = 0;
    for (const c of camps) {
      if (!c.title) continue;
      const sd = parseDate(c.start_date, 0), ed = parseDate(c.end_date, 4);
      const lat = toNum(c.latitude) || latitude, lng = toNum(c.longitude) || longitude;
      const ex = await fetch(`${SB_URL}/rest/v1/camps?title=eq.${encodeURIComponent(c.title)}&start_date=eq.${sd}&select=id`, { headers: sbH });
      if ((await ex.json())?.length > 0) continue;
      const cost = toNum(c.cost) || toNum(c.cost_eur) || toNum(c.cost_local);
      const r = await fetch(`${SB_URL}/rest/v1/camps`, { method: 'POST', headers: sbH, body: JSON.stringify({
        title: c.title, camp_type: normCampType(c.camp_type || ''), start_date: sd, end_date: ed,
        daily_start_time: c.daily_start_time || null, daily_end_time: c.daily_end_time || null,
        age_min: toInt(c.age_min, 4), age_max: toInt(c.age_max, 14), cost_eur: cost,
        currency: currency,
        location_name: c.location_name || areaName, location_address: c.location_address || areaName,
        latitude: lat, longitude: lng, booking_url: c.booking_url || null,
        source: 'ai_scrape', scrape_confidence: 0.7, needs_review: true, status: 'active', region_id: regionId
      }) });
      if (r.ok) ci++; else { const e = await r.text(); await log('camp_err', `${c.title}: ${e.substring(0,200)}`); }
    }

    // INSERT CLUBS
    let cli = 0;
    for (const c of clubs) {
      if (!c.name) continue;
      const slug = c.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-');
      const lat = toNum(c.latitude) || latitude, lng = toNum(c.longitude) || longitude;
      const ex = await fetch(`${SB_URL}/rest/v1/clubs?name=eq.${encodeURIComponent(c.name)}&select=id`, { headers: sbH });
      if ((await ex.json())?.length > 0) continue;
      const r = await fetch(`${SB_URL}/rest/v1/clubs`, { method: 'POST', headers: sbH, body: JSON.stringify({
        name: c.name, slug, category: c.category || 'multi_activity', website_url: c.website_url || null,
        location: c.location || areaName, address: c.address || null,
        latitude: lat, longitude: lng, source: 'external', region_id: regionId, currency: currency
      }) });
      if (r.ok) cli++; else { const e = await r.text(); await log('club_err', `${c.name}: ${e.substring(0,200)}`); }
    }

    // INSERT THINGS TO DO
    let ti = 0;
    for (const t of things) {
      if (!t.title) continue;
      const lat = toNum(t.latitude) || latitude, lng = toNum(t.longitude) || longitude;
      const ex = await fetch(`${SB_URL}/rest/v1/things_to_do?title=eq.${encodeURIComponent(t.title)}&select=id`, { headers: sbH });
      if ((await ex.json())?.length > 0) continue;
      const cost = toNum(t.cost) || toNum(t.cost_eur) || toNum(t.cost_local);
      const r = await fetch(`${SB_URL}/rest/v1/things_to_do`, { method: 'POST', headers: sbH, body: JSON.stringify({
        title: t.title, description: t.description || null, category: normThingCat(t.category || ''),
        age_min: toInt(t.age_min, 0), age_max: toInt(t.age_max, 99), audience: t.audience || 'family', cost_eur: cost,
        currency: currency,
        location_name: t.location_name || areaName, location_address: t.location_address || areaName,
        latitude: lat, longitude: lng, website_url: t.website_url || null,
        seasonal: t.seasonal || false, season_start: t.season_start || null, season_end: t.season_end || null,
        source: 'ai_scrape', region_id: regionId, status: 'active'
      }) });
      if (r.ok) ti++; else { const e = await r.text(); await log('thing_err', `${t.title}: ${e.substring(0,200)}`); }
    }

    // INSERT SCHOOLS
    let si = 0;
    for (const s of schools) {
      if (!s.name) continue;
      const lat = toNum(s.latitude) || latitude, lng = toNum(s.longitude) || longitude;
      const ex = await fetch(`${SB_URL}/rest/v1/schools?name=eq.${encodeURIComponent(s.name)}&select=id`, { headers: sbH });
      if ((await ex.json())?.length > 0) continue;
      const r = await fetch(`${SB_URL}/rest/v1/schools`, { method: 'POST', headers: sbH, body: JSON.stringify({
        name: s.name, address: s.address || null, county: geo.county || null,
        school_type: s.school_type || 'primary', ethos: s.ethos || null,
        website: s.website || null, latitude: lat, longitude: lng,
        source: 'ai_scrape', region_id: regionId, country: geo.country || null
      }) });
      if (r.ok) si++; else { const e = await r.text(); await log('school_err', `${s.name}: ${e.substring(0,200)}`); }
    }

    await log('done', `area=${areaName} currency=${currency} camps=${ci}/${camps.length} clubs=${cli}/${clubs.length} things=${ti}/${things.length} schools=${si}/${schools.length}`);
    return new Response(JSON.stringify({ status: 'success', area_name: areaName, currency,
      camps_found: camps.length, camps_inserted: ci, clubs_found: clubs.length, clubs_inserted: cli,
      things_found: things.length, things_inserted: ti, schools_found: schools.length, schools_inserted: si
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    await log('error', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
});
