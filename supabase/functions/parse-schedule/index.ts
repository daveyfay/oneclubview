import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_KEY') || '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const { text, kids, clubs, parent_name, user_id } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: 'text required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const events: any[] = [];
    let action = 'schedule_update';
    let notifications: string[] = [];
    let fee: any = null;
    let term: any = null;
    let summary = '';

    const dayMap: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
    const timeRe = /(\d{1,2})[:.](\d{2})\s*(?:am|pm|AM|PM)?/g;
    const dayRe = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi;

    if (ANTHROPIC_KEY) {
      try {
        const kidsStr = kids?.map((k: any) => `${k.name} (id:${k.id})`).join(', ') || 'unknown';
        const clubsStr = clubs?.map((c: any) => `${c.name} (id:${c.id}, nickname:${c.nickname||c.name})`).join(', ') || 'unknown';

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            system: `You parse messages from kids' clubs/coaches into structured actions. The family has kids: ${kidsStr}. Their clubs: ${clubsStr}.\n\nReturn ONLY a JSON object:\n{\n  "action": "schedule_update" | "cancellation" | "fee_due" | "term_dates" | "general",\n  "summary": "Brief human-readable summary",\n  "notifications": ["Text to notify family members about"],\n  "events": [{"title": string, "day_of_week": number(0=Sun..6=Sat)|null, "date": "YYYY-MM-DD"|null, "start_time": "HH:MM"(24h)|null, "duration_minutes": number|null, "recurring": boolean, "dependant_id": string|null, "club_id": string|null, "cancelled": boolean}],\n  "fee": {"description": string, "amount": number, "due_date": "YYYY-MM-DD", "club_id": string|null, "dependant_id": string|null}|null,\n  "term": {"club_id": string|null, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}|null\n}\nReturn ONLY valid JSON, no markdown.`,
            messages: [{ role: 'user', content: text }],
          }),
        });

        const data = await res.json();
        const responseText = data.content?.[0]?.text || '';
        const clean = responseText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        
        return new Response(JSON.stringify({
          events: parsed.events || [],
          action: parsed.action || 'general',
          summary: parsed.summary || '',
          notifications: parsed.notifications || [],
          fee: parsed.fee || null,
          term: parsed.term || null,
          count: (parsed.events || []).length
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (e) {
        // Fall through to regex
      }
    }

    // Regex fallback
    const textLower = text.toLowerCase();
    if (textLower.includes('no class') || textLower.includes('no training') || textLower.includes('cancelled') || textLower.includes('canceled')) {
      action = 'cancellation';
      notifications.push('Class cancelled \u2014 check the message for details');
    }
    
    const feeMatch = textLower.match(/(\u20ac|eur)\s*(\d+)/i);
    if (feeMatch) {
      action = 'fee_due';
      fee = { description: 'Club fee', amount: parseInt(feeMatch[2]), due_date: null };
    }

    const lines = text.split('\n');
    for (const line of lines) {
      const dayMatches = line.match(dayRe);
      const timeMatches = [...line.matchAll(timeRe)];
      if (dayMatches && timeMatches.length > 0) {
        const dow = dayMap[dayMatches[0].toLowerCase()];
        if (dow !== undefined) {
          let h = parseInt(timeMatches[0][1]);
          const m = parseInt(timeMatches[0][2]);
          if (line.toLowerCase().includes('pm') && h < 12) h += 12;
          const startTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          let dur = 60;
          if (timeMatches.length > 1) {
            let h2 = parseInt(timeMatches[1][1]);
            const m2 = parseInt(timeMatches[1][2]);
            if (line.toLowerCase().includes('pm') && h2 < 12) h2 += 12;
            dur = (h2 * 60 + m2) - (h * 60 + m);
            if (dur <= 0) dur = 60;
          }
          events.push({
            title: line.replace(timeRe, '').replace(dayRe, '').replace(/[-\u2013,]/g, '').trim().substring(0, 50) || 'Training',
            day_of_week: dow, start_time: startTime, duration_minutes: dur,
            recurring: true, dependant_id: null, club_id: null, cancelled: false,
          });
        }
      }
    }

    return new Response(JSON.stringify({ events, action, summary, notifications, fee, term, count: events.length }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
