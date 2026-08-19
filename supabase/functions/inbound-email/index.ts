import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_INBOUND_KEY') || '';
const SB_URL = 'https://uqihwazheypvmrcrqklg.supabase.co';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_KEY') || '';

const sbH = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  try {
    const payload = await req.json();
    if (payload.type !== 'email.received') return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { 'Content-Type': 'application/json' } });
    const { email_id, from: fromAddr, to: toAddrs, subject } = payload.data;

    // CORRECT API: /emails/receiving/{id} for received email content
    let emailBody = '', emailHtml = '';
    try {
      const r = await fetch(`https://api.resend.com/emails/receiving/${email_id}`, {
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` },
      });
      if (r.ok) {
        const d = await r.json();
        emailBody = d.text || '';
        emailHtml = d.html || '';
        if (!emailBody && emailHtml) {
          emailBody = emailHtml.replace(/<style[^>]*>.*?<\/style>/gs, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
    } catch(e) {}
    if (!emailBody) emailBody = subject || '';

    // Extract URLs from HTML for payment links
    const urls: string[] = [];
    if (emailHtml) { const m = emailHtml.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi); for (const u of m) urls.push(u[1]); }

    // Find user by sender email
    const fromEmail = typeof fromAddr === 'string' ? fromAddr.match(/[\w.-]+@[\w.-]+/)?.[0] || fromAddr : '';
    let userId = '', userProfile: any = null;
    const pRes = await fetch(`${SB_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(fromEmail)}&select=*`, { headers: sbH });
    const profiles = await pRes.json();
    if (profiles?.[0]) { userProfile = profiles[0]; userId = userProfile.id; }
    if (!userId) {
      await fetch(`${SB_URL}/rest/v1/inbound_messages`, { method: 'POST', headers: sbH, body: JSON.stringify({ source: 'email', from_address: fromEmail, subject, body: emailBody.substring(0, 5000), parsed_action: 'unmatched' }) });
      return new Response(JSON.stringify({ ok: true, matched: false, body_length: emailBody.length }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Context
    const [kR, cR] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/dependants?parent_user_id=eq.${userId}&select=id,first_name`, { headers: sbH }),
      fetch(`${SB_URL}/rest/v1/hub_subscriptions?user_id=eq.${userId}&select=*,clubs(id,name)`, { headers: sbH })
    ]);
    const kids = await kR.json() || [], clubs = await cR.json() || [];

    // AI parse
    let parsed: any = { events: [], action: 'general', summary: '', notifications: [], fee: null, term: null };
    try {
      const kS = kids.map((k:any) => `${k.first_name}(id:${k.id})`).join(',') || 'none';
      const cS = clubs.map((c:any) => `${c.clubs?.name||'?'}(id:${c.club_id})`).join(',') || 'none';
      const aiR = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500,
          system: `Parse forwarded club/activity messages for a family. Kids: ${kS}. Clubs: ${cS}. URLs: ${urls.slice(0,5).join(', ')}\nReturn ONLY JSON:\n{"action":"schedule_update"|"cancellation"|"fee_due"|"term_dates"|"reminder"|"general","summary":"brief summary for both parents","notifications":["text for the other parent"],"events":[{"title":str,"day_of_week":0-6|null,"date":"YYYY-MM-DD"|null,"start_time":"HH:MM"|null,"duration_minutes":num|null,"recurring":bool,"dependant_id":str|null,"club_id":str|null,"cancelled":bool}],"fee":{"description":str,"amount":num,"due_date":"YYYY-MM-DD"|null,"club_id":str|null,"payment_url":str|null}|null,"term":{"club_id":str|null,"start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD"}|null}\nFor "sessions remaining" or "top up" messages, use action "reminder".\nFor fees, extract payment_url if a payment link exists in the URLs.\nMatch to specific kids and clubs when context allows.\nReturn ONLY valid JSON.`,
          messages: [{ role: 'user', content: `Subject: ${subject}\n\n${emailBody}` }] })
      });
      const aiD = await aiR.json();
      parsed = JSON.parse((aiD.content?.[0]?.text||'').replace(/```json|```/g,'').trim());
    } catch(e) {
      const lo = emailBody.toLowerCase();
      if (lo.includes('no class')||lo.includes('cancelled')) parsed = {...parsed,action:'cancellation',summary:'Possible cancellation',notifications:['Cancellation notice forwarded']};
      else if (lo.match(/\u20ac\s*\d+/)||lo.includes('fee')||lo.includes('payment')) parsed = {...parsed,action:'fee_due',summary:'Fee notice',notifications:['Fee notice forwarded']};
      else if (lo.includes('session')||lo.includes('remaining')||lo.includes('reminder')||lo.includes('top up')) parsed = {...parsed,action:'reminder',summary:'Club reminder',notifications:['Reminder forwarded']};
      else parsed = {...parsed,notifications:['Club message forwarded']};
    }

    // Apply
    for (const ev of (parsed.events||[])) {
      if (ev.cancelled) continue;
      if (ev.recurring&&ev.day_of_week!=null) await fetch(`${SB_URL}/rest/v1/recurring_events`,{method:'POST',headers:sbH,body:JSON.stringify({user_id:userId,club_id:ev.club_id||null,dependant_id:ev.dependant_id||null,day_of_week:ev.day_of_week,start_time:ev.start_time||null,duration_minutes:ev.duration_minutes||60,title:ev.title||null,excluded_dates:[]})});
      else if (ev.date) await fetch(`${SB_URL}/rest/v1/manual_events`,{method:'POST',headers:sbH,body:JSON.stringify({user_id:userId,club_id:ev.club_id||null,dependant_id:ev.dependant_id||null,event_date:ev.date,start_time:ev.start_time||null,duration_minutes:ev.duration_minutes||60,title:ev.title||null})});
    }
    if (parsed.fee) await fetch(`${SB_URL}/rest/v1/payment_reminders`,{method:'POST',headers:sbH,body:JSON.stringify({user_id:userId,club_id:parsed.fee.club_id||null,dependant_id:parsed.fee.dependant_id||null,description:parsed.fee.description||'Fee',amount:parsed.fee.amount,due_date:parsed.fee.due_date,paid:false,payment_url:parsed.fee.payment_url||null})});
    if (parsed.term?.club_id) await fetch(`${SB_URL}/rest/v1/clubs?id=eq.${parsed.term.club_id}`,{method:'PATCH',headers:sbH,body:JSON.stringify({term_start:parsed.term.start_date,term_end:parsed.term.end_date})});

    // Store
    await fetch(`${SB_URL}/rest/v1/inbound_messages`,{method:'POST',headers:sbH,body:JSON.stringify({user_id:userId,source:'email',from_address:fromEmail,subject,body:emailBody.substring(0,5000),parsed_action:parsed.action,parsed_data:parsed,applied:true})});

    // Notify family
    if (parsed.notifications?.length>0&&userProfile?.family_id) {
      const fR = await fetch(`${SB_URL}/rest/v1/profiles?family_id=eq.${userProfile.family_id}&id=neq.${userId}&select=email,first_name`,{headers:sbH});
      for (const fm of (await fR.json()||[])) {
        if (!fm.email) continue;
        await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${RESEND_API_KEY}`},body:JSON.stringify({from:'OneClubView <hello@oneclubview.com>',to:[fm.email],subject:parsed.summary||'Club update',html:`<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto"><div style="background:linear-gradient(135deg,#1a2a3a,#2d4a5f);border-radius:16px 16px 0 0;padding:20px;text-align:center"><h1 style="color:#fff;font-size:20px;margin:0;font-family:Georgia,serif">OneClubView</h1></div><div style="background:#fff;padding:24px;border:1px solid #e4e2de;border-top:none;border-radius:0 0 16px 16px"><p style="font-size:14px;color:#1a2a3a;margin:0 0 8px">Hi ${fm.first_name||'there'},</p><p style="font-size:13px;color:#333;margin:0 0 16px">${userProfile.first_name||'Partner'} forwarded a club update:</p><div style="background:#f8f6f3;border-left:4px solid #e85d4a;border-radius:8px;padding:14px;margin:0 0 16px">${parsed.notifications.map((n:string)=>`<p style="font-size:13px;color:#1a2a3a;margin:0 0 4px">${n}</p>`).join('')}</div>${parsed.fee?`<div style="background:#fff0ee;border-radius:8px;padding:12px;margin:0 0 16px"><strong style="color:#e85d4a">\u20ac${parsed.fee.amount}</strong> ${parsed.fee.description||''}${parsed.fee.payment_url?` <a href="${parsed.fee.payment_url}" style="color:#e85d4a;font-weight:700">Pay now</a>`:''}</div>`:''}<div style="text-align:center"><a href="https://oneclubview.com" style="display:inline-block;padding:10px 24px;background:#1a2a3a;color:#e85d4a;font-weight:700;font-size:13px;border-radius:10px;text-decoration:none">Open app</a></div></div></div>`})});
      }
    }

    return new Response(JSON.stringify({ok:true,action:parsed.action,summary:parsed.summary,body_length:emailBody.length}),{headers:{'Content-Type':'application/json'}});
  } catch(err) { return new Response(JSON.stringify({error:(err as Error).message}),{status:500,headers:{'Content-Type':'application/json'}}); }
});
