import React, { useState } from 'react';
import Logo from '../components/Logo';

function FeatureTiles() {
  const [open, setOpen] = useState(null);
  const tiles = [
    {
      i: 'cal',
      t: 'Weekly family view',
      d: 'Every club, every kid, colour-coded.',
      ex: {
        title: 'Your week at a glance',
        items: [
          { c: '#2d5a3f', who: 'Penny', what: 'Swimming Training', when: 'Tue 17:00–18:00' },
          { c: '#2d7cb5', who: 'Cooper', what: 'GAA Training', when: 'Tue 16:30–18:00' },
          { c: '#c0392b', who: '', what: '⚠️ Clash! Both kids at 17:00 on Tuesday', when: '' },
          { c: '#2d5a3f', who: 'Penny', what: 'Gymnastics', when: 'Thu 15:30–16:30' },
          { c: '#8e44ad', who: 'You', what: 'Tennis', when: 'Sat 10:00–11:00' }
        ]
      }
    },
    {
      i: 'card',
      t: 'Fee tracker',
      d: 'Total spend across every club, per kid.',
      ex: {
        title: 'Payment reminders',
        items: [
          { c: '#dc2626', who: 'Penny', what: 'Swimming — Term 3 fee', when: '€180 · Due 15 Apr · OVERDUE' },
          { c: '#2d7cb5', who: 'Cooper', what: 'GAA registration', when: '€50 · Due 1 May' },
          { c: '#2d5a3f', who: 'Penny', what: 'Gymnastics — April', when: '€65 · Paid ✓' }
        ]
      }
    },
    {
      i: 'tent',
      t: 'Camp discovery',
      d: "Matched to your family's ages and interests.",
      ex: {
        title: '🐣 Easter Break · 27 Mar – 10 Apr',
        items: [
          {
            c: '#1a56db',
            who: '👧 Suits Penny, Cooper',
            what: 'Easter Adventure Camp – Bull Island',
            when: '€160 · Ages 5–12 · ✓ Covers work day'
          },
          { c: '#1a56db', who: '👧 Suits Penny', what: 'Easter Drama & Musical Theatre', when: '€110 · Ages 6–10' },
          { c: '#2d5a3f', who: '🏫', what: '2 families from 2nd Class at Scoil Bhríde booked this camp', when: '' }
        ]
      }
    },
    {
      i: 'child',
      t: 'Per-child view',
      d: 'Tap a name — see only their stuff.',
      ex: {
        title: 'Filtered: Penny (7)',
        items: [
          { c: '#2d5a3f', who: 'Penny', what: 'Swimming Tue 17:00–18:00', when: '' },
          { c: '#2d5a3f', who: 'Penny', what: 'Gymnastics Thu 15:30–16:30', when: '' },
          { c: '#dc2626', who: 'Penny', what: 'Swimming fee — €180 overdue', when: '' },
          { c: '#1a56db', who: 'Penny', what: '3 Easter camps suit her age', when: '' }
        ]
      }
    },
    {
      i: 'search',
      t: 'Smart club search',
      d: 'Type a name, find real clubs near you.',
      ex: {
        title: "Search: 'swim'",
        items: [
          { c: '#2d5a3f', who: '⭐ 4.5', what: 'Trojan Swim Club', when: "St Anne's Park, Raheny" },
          { c: '#2d7cb5', who: '⭐ 4.3', what: 'Clontarf Swimming Club', when: 'Clontarf Rd, Dublin 3' },
          { c: '#888', who: '+', what: 'Not listed? Add your own club', when: '' }
        ]
      }
    },
    {
      i: 'clock',
      t: 'Work-day filter',
      d: 'Camps that run 9–3 so you can work.',
      ex: {
        title: 'Camps that cover your work day',
        items: [
          { c: '#2d5a3f', who: '✓ 09:00–15:30', what: 'Easter Adventure Camp – Bull Island', when: '€160 · Covers work day' },
          { c: '#2d5a3f', who: '✓ 09:30–15:00', what: 'Multi-Sport Easter Camp', when: '€140 · Covers work day' },
          { c: '#dc2626', who: '✗ 10:00–13:00', what: 'Easter Art Workshop', when: '€90 · Finishes too early' }
        ]
      }
    }
  ];

  return (
    <div className="ocv-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 20, marginTop: 48 }}>
      {tiles.map((f, i) => (
        <div
          key={i}
          onClick={() => setOpen(open === i ? null : i)}
          style={{
            background: open === i ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.07)',
            borderRadius: 20,
            padding: 24,
            border: open === i ? '1px solid rgba(255,255,255,.25)' : '1px solid rgba(255,255,255,.1)',
            cursor: 'pointer',
            transition: 'all .2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {(() => {
              const ic = {
                cal: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <rect x="7" y="14" width="3" height="3" rx=".5" fill="rgba(255,255,255,.3)" />
                  </svg>
                ),
                card: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                    <line x1="6" y1="16" x2="10" y2="16" />
                  </svg>
                ),
                tent: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 22h20L12 2z" />
                    <path d="M12 2v20" />
                    <path d="M8 22l4-8 4 8" />
                  </svg>
                ),
                child: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="5" r="3" />
                    <path d="M12 8v6" />
                    <path d="M8 14l4 8 4-8" />
                    <path d="M9 11h6" />
                  </svg>
                ),
                search: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" />
                  </svg>
                ),
                clock: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )
              };
              return ic[f.i] || <span style={{ fontSize: 28 }}>{f.i}</span>;
            })()}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>{open === i ? '▲' : 'TAP ▼'}</span>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 12 }}>{f.t}</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginTop: 6, lineHeight: 1.5 }}>{f.d}</p>
          {open === i && (
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#e85d4a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {f.ex.title}
              </p>
              {f.ex.items.map((item, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 4, height: 32, borderRadius: 2, background: item.c, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    {item.who && <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>{item.who} </span>}
                    <span style={{ fontSize: 13, color: '#fff' }}>{item.what}</span>
                    {item.when && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{item.when}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function detectCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('America')) return 'US';
    if (tz.startsWith('Australia')) return 'AU';
    if (tz.includes('London') || tz.includes('Belfast')) return 'GB';
    return 'IE';
  } catch (e) {
    return 'IE';
  }
}

const USER_COUNTRY = detectCountry();

function Landing({ onGo, onLogin }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        @media(max-width:520px){
          .ocv-pricing-grid{grid-template-columns:1fr !important;gap:16px !important}
          .ocv-feature-grid{grid-template-columns:1fr 1fr !important;gap:12px !important}
          .ocv-social-proof{flex-wrap:wrap;justify-content:center;gap:8px 16px !important;font-size:11px !important}
          .ocv-hero-btns{flex-direction:column;gap:8px !important}
          .ocv-hero-btns button{width:100%}
          .ocv-screenshots{justify-content:flex-start !important;padding:0 20px 16px !important}
          .ocv-screenshots>div>div:first-child{width:180px !important}
        }
        @media(max-width:360px){
          .ocv-feature-grid{grid-template-columns:1fr !important}
        }
      `}</style>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg, #1a2a3a 0%, #2d4a5f 50%, #1a3a4a 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,93,74,.15) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,.04) 0%,transparent 70%)' }} />
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 24px 48px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
            <Logo dark />
            <button
              onClick={onLogin}
              style={{
                padding: '8px 20px',
                borderRadius: 10,
                border: '1.5px solid rgba(255,255,255,.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,.8)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "var(--sn)"
              }}
            >
              Log in
            </button>
          </div>
          <div className="r" style={{ marginBottom: 12 }}>
            <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 100, background: 'rgba(232,93,74,.15)', color: '#e85d4a', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
              FOR BUSY PARENTS
            </span>
          </div>
          <h1 className="r2" style={{ fontFamily: "var(--sr)", fontSize: 'clamp(32px,6vw,48px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 16 }}>
            All your kids' activities.
            <br />
            <span style={{ color: '#e85d4a' }}>One calm view.</span>
          </h1>
          <p className="r3" style={{ fontSize: 16, color: 'rgba(255,255,255,.65)', lineHeight: 1.6, marginBottom: 32, maxWidth: 380 }}>
            Schedule clashes, forgotten fees, full camps. OneClubView takes the chaos out of extracurricular life — for both parents.
          </p>
          <div className="r4 ocv-hero-btns" style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onGo}
              style={{
                padding: '14px 28px',
                borderRadius: 14,
                border: 'none',
                background: '#e85d4a',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "var(--sn)",
                boxShadow: '0 4px 16px rgba(232,93,74,.35)'
              }}
            >
              Start free — 14 days
            </button>
            <button
              onClick={onLogin}
              style={{
                padding: '14px 20px',
                borderRadius: 14,
                border: '1.5px solid rgba(255,255,255,.15)',
                background: 'transparent',
                color: 'rgba(255,255,255,.7)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "var(--sn)"
              }}
            >
              I have an account
            </button>
          </div>
        </div>
      </div>
      {/* SOCIAL PROOF */}
      <div style={{ background: '#fff', padding: '20px 24px', borderBottom: '1px solid var(--bd)' }}>
        <div className="ocv-social-proof" style={{ maxWidth: 520, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, fontSize: 12, color: 'var(--mt)' }}>
          <span>
            <strong style={{ color: 'var(--tx)' }}>Schedule</strong> every club
          </span>
          <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--bd)' }} />
          <span>
            <strong style={{ color: 'var(--tx)' }}>Track</strong> every fee
          </span>
          <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--bd)' }} />
          <span>
            <strong style={{ color: 'var(--tx)' }}>Both parents</strong> in the loop
          </span>
        </div>
      </div>
      {/* PROBLEM */}
      <section style={{ padding: '56px 24px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "var(--sr)", fontSize: 'clamp(24px,4vw,32px)', fontWeight: 800, color: 'var(--g)', marginBottom: 8 }}>
            Sound familiar?
          </h2>
          <p style={{ fontSize: 14, color: 'var(--mt)', marginBottom: 24 }}>The mental load of managing activities is real.</p>
          {(USER_COUNTRY === 'US'
            ? [
              { e: 'msg', t: '4 group texts for 4 activities', d: 'and you still miss things' },
              { e: 'pay', t: 'Did I pay for soccer?', d: 'nobody in the house knows' },
              { e: 'clash', t: 'Baseball clashes with piano', d: 'found out at 5:45pm in the car' },
              { e: 'camp', t: 'Summer camps are full', d: 'because you heard about them too late' },
              { e: 'shrug', t: `"What's on today?"`, d: 'your spouse asks — you check 4 places to answer' }
            ]
            : USER_COUNTRY === 'AU'
              ? [
                { e: 'msg', t: '4 group chats for 4 activities', d: 'and you still miss things' },
                { e: 'pay', t: 'Did I pay for swimming?', d: 'nobody in the house knows' },
                { e: 'clash', t: 'Cricket clashes with gymnastics', d: 'found out at 5:45pm in the car' },
                { e: 'camp', t: 'School holiday programs are full', d: 'because you heard about them too late' },
                { e: 'shrug', t: `"What's on today?"`, d: 'your partner asks — you check 4 places to answer' }
              ]
              : [
                { e: 'msg', t: '3 WhatsApp groups for 3 clubs', d: 'and you still miss things' },
                { e: 'pay', t: 'Did I pay for swimming?', d: 'nobody in the house knows' },
                { e: 'clash', t: 'GAA clashes with gymnastics', d: 'found out at 5:45pm in the car' },
                { e: 'camp', t: 'Easter camps are full', d: 'because you heard about them too late' },
                { e: 'shrug', t: `"What's on today?"`, d: 'partner asks — you check 4 places to answer' }
              ]
          ).map((p, i) => (
            <div key={i} className={'r' + (i + 1 > 4 ? '4' : i + 1)} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < 4 ? '1px solid var(--bd)' : 'none' }}>
              {(() => {
                const ic = {
                  msg: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      <line x1="8" y1="8" x2="16" y2="8" />
                      <line x1="8" y1="12" x2="13" y2="12" />
                    </svg>
                  ),
                  pay: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  ),
                  clash: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  ),
                  camp: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 22h20L12 2z" />
                      <path d="M12 2v20" />
                    </svg>
                  ),
                  shrug: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 15h8" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  )
                };
                return <span style={{ flexShrink: 0, marginTop: 2 }}>{ic[p.e] || <span style={{ fontSize: 22 }}>{p.e}</span>}</span>;
              })()}
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{p.t}</span> <span style={{ fontSize: 14, color: 'var(--mt)' }}>— {p.d}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* SOLUTION */}
      <section style={{ background: 'linear-gradient(135deg, #1a2a3a 0%, #2d4a5f 100%)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e85d4a', textTransform: 'uppercase', letterSpacing: 1 }}>The fix</span>
          <h2 style={{ fontFamily: "var(--sr)", fontSize: 'clamp(24px,4vw,32px)', fontWeight: 800, color: '#fff', margin: '8px 0 32px' }}>
            One screen. Whole family.
          </h2>
          <FeatureTiles />
        </div>
      </section>
      {/* HOW IT WORKS */}
      <section style={{ padding: '56px 24px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "var(--sr)", fontSize: 'clamp(24px,4vw,32px)', fontWeight: 800, color: 'var(--g)', marginBottom: 32 }}>
            Up and running in 2 minutes
          </h2>
          {[
            { n: '1', t: 'Add your kids', d: 'Name, age, school — that\'s it.' },
            { n: '2', t: 'Find their clubs', d: 'Search our database or add your own.' },
            { n: '3', t: 'See your week', d: 'One view. Clashes flagged. Fees tracked.' },
            { n: '4', t: 'Invite your partner', d: 'They see everything. Mental load: shared.' }
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, marginBottom: i < 3 ? 28 : 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: i === 3 ? '#e85d4a' : 'var(--g)', color: '#fff', fontFamily: "var(--sr)", fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.n}
              </div>
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{s.t}</div>
                <div style={{ fontSize: 13, color: 'var(--mt)', marginTop: 2 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* APP MOCKUPS */}
      <section style={{ padding: '56px 24px', background: 'var(--warm)', overflow: 'hidden' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e85d4a', textTransform: 'uppercase', letterSpacing: 1 }}>See it in action</span>
          <h2 style={{ fontFamily: "var(--sr)", fontSize: 'clamp(24px,4vw,32px)', fontWeight: 800, color: 'var(--g)', margin: '8px 0 32px' }}>
            Built for real family life
          </h2>
          <div className="ocv-screenshots" style={{ display: 'flex', gap: 20, justifyContent: 'center', overflowX: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 0 16px', scrollSnapType: 'x mandatory' }}>

            {/* MOCKUP 1: Weekly Schedule Grid */}
            <div style={{ flexShrink: 0, scrollSnapAlign: 'center' }}>
              <div style={{ width: 220, borderRadius: 24, border: '3px solid #1a1a1a', overflow: 'hidden', background: '#f8f6f3', boxShadow: '0 16px 48px rgba(0,0,0,.15)' }}>
                <div style={{ width: 60, height: 14, background: '#1a1a1a', borderRadius: '0 0 10px 10px', margin: '0 auto' }} />
                <div style={{ padding: '8px 10px 12px' }}>
                  {/* Mini header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--sr)', fontSize: 9, fontWeight: 800, color: 'var(--g)' }}>OneClubView</span>
                    <div style={{ width: 16, height: 16, borderRadius: 5, background: 'var(--g)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 700 }}>D</div>
                  </div>
                  {/* Pills */}
                  <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                    <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'var(--g)', color: '#fff' }}>Everyone</span>
                    <span style={{ fontSize: 7, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: '#fff', color: 'var(--mt)', border: '1px solid var(--bd)' }}>Penny (8)</span>
                    <span style={{ fontSize: 7, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: '#fff', color: 'var(--mt)', border: '1px solid var(--bd)' }}>Cooper (5)</span>
                  </div>
                  {/* Tabs */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', marginBottom: 6 }}>
                    {['Overview', 'Schedule', 'Money', 'Explore'].map((t, i) => (
                      <span key={t} style={{ flex: 1, fontSize: 6, fontWeight: 600, color: i === 1 ? 'var(--g)' : 'var(--mt)', textAlign: 'center', padding: '4px 0 3px', borderBottom: i === 1 ? '1.5px solid var(--g)' : 'none' }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--sr)', fontSize: 10, fontWeight: 800, color: 'var(--g)' }}>This week</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <span style={{ fontSize: 6, fontWeight: 600, padding: '1px 4px', borderRadius: 3, background: 'var(--accl)', color: 'var(--acc)' }}>Grid</span>
                      <span style={{ fontSize: 6, fontWeight: 600, padding: '1px 4px', borderRadius: 3, color: 'var(--mt)' }}>List</span>
                    </div>
                  </div>
                  {/* Grid header */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 3 }}>
                    {[{ d: 'MON', n: '24' }, { d: 'TUE', n: '25' }, { d: 'WED', n: '26', today: true }, { d: 'THU', n: '27' }].map(day => (
                      <div key={day.d} style={{ textAlign: 'center', padding: '2px 0', borderRadius: 5, background: day.today ? 'var(--g)' : 'transparent' }}>
                        <div style={{ fontSize: 5, fontWeight: 700, color: day.today ? 'rgba(255,255,255,.6)' : 'var(--mt)' }}>{day.d}</div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: day.today ? '#fff' : 'var(--tx)' }}>{day.n}</div>
                      </div>
                    ))}
                  </div>
                  {/* Event blocks */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                    {/* Mon */}
                    <div>
                      <div style={{ background: '#fff', borderRadius: 5, padding: 3, borderLeft: '2px solid #2d5a3f', marginBottom: 2 }}>
                        <div style={{ fontSize: 5, fontWeight: 700, color: '#2d5a3f' }}>Swimming</div>
                        <div style={{ fontSize: 4, color: 'var(--mt)' }}>Penny · 16:00</div>
                      </div>
                    </div>
                    {/* Tue */}
                    <div>
                      <div style={{ background: '#fff', borderRadius: 5, padding: 3, borderLeft: '2px solid #2d7cb5', marginBottom: 2 }}>
                        <div style={{ fontSize: 5, fontWeight: 700, color: '#2d7cb5' }}>GAA</div>
                        <div style={{ fontSize: 4, color: 'var(--mt)' }}>Cooper · 16:30</div>
                      </div>
                      <div style={{ background: '#fef2f2', borderRadius: 5, padding: 3, borderLeft: '2px solid #dc2626' }}>
                        <div style={{ fontSize: 5, fontWeight: 700, color: '#dc2626' }}>Gym</div>
                        <div style={{ fontSize: 4, color: '#dc2626' }}>Penny · 16:30</div>
                        <div style={{ fontSize: 4, color: '#dc2626', fontWeight: 700 }}>⚠️ Clash</div>
                      </div>
                    </div>
                    {/* Wed */}
                    <div>
                      <div style={{ background: '#fff', borderRadius: 5, padding: 3, borderLeft: '2px solid #9b4dca' }}>
                        <div style={{ fontSize: 5, fontWeight: 700, color: '#9b4dca' }}>Tennis</div>
                        <div style={{ fontSize: 4, color: 'var(--mt)' }}>Dave · 18:00</div>
                      </div>
                    </div>
                    {/* Thu */}
                    <div>
                      <div style={{ background: '#fff', borderRadius: 5, padding: 3, borderLeft: '2px solid #2d5a3f', marginBottom: 2 }}>
                        <div style={{ fontSize: 5, fontWeight: 700, color: '#2d5a3f' }}>Gym</div>
                        <div style={{ fontSize: 4, color: 'var(--mt)' }}>Penny · 15:30</div>
                      </div>
                      <div style={{ background: '#fff', borderRadius: 5, padding: 3, borderLeft: '2px solid #c4960c' }}>
                        <div style={{ fontSize: 5, fontWeight: 700, color: '#c4960c' }}>Rugby</div>
                        <div style={{ fontSize: 4, color: 'var(--mt)' }}>Cooper · 16:00</div>
                      </div>
                    </div>
                  </div>
                  {/* Forward emails banner */}
                  <div style={{ background: 'var(--gxl)', borderRadius: 6, padding: '4px 6px', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 8 }}>📧</span>
                    <span style={{ fontSize: 5, fontWeight: 600, color: 'var(--gl)' }}>Forward club emails to auto-update</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mt)', marginTop: 10 }}>Weekly schedule</div>
            </div>

            {/* MOCKUP 2: Overview with My Clubs */}
            <div style={{ flexShrink: 0, scrollSnapAlign: 'center' }}>
              <div style={{ width: 220, borderRadius: 24, border: '3px solid #1a1a1a', overflow: 'hidden', background: '#f8f6f3', boxShadow: '0 16px 48px rgba(0,0,0,.15)' }}>
                <div style={{ width: 60, height: 14, background: '#1a1a1a', borderRadius: '0 0 10px 10px', margin: '0 auto' }} />
                <div style={{ padding: '8px 10px 12px' }}>
                  {/* Mini header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--sr)', fontSize: 9, fontWeight: 800, color: 'var(--g)' }}>OneClubView</span>
                    <div style={{ width: 16, height: 16, borderRadius: 5, background: 'var(--g)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 700 }}>D</div>
                  </div>
                  {/* Tabs */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', marginBottom: 6 }}>
                    {['Overview', 'Schedule', 'Money', 'Explore'].map((t, i) => (
                      <span key={t} style={{ flex: 1, fontSize: 6, fontWeight: 600, color: i === 0 ? 'var(--g)' : 'var(--mt)', textAlign: 'center', padding: '4px 0 3px', borderBottom: i === 0 ? '1.5px solid var(--g)' : 'none' }}>{t}</span>
                    ))}
                  </div>
                  {/* Stats card */}
                  <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--bd)', padding: 8, marginBottom: 6 }}>
                    <div style={{ fontFamily: 'var(--sr)', fontSize: 8, fontWeight: 700, color: 'var(--g)', marginBottom: 4 }}>This week</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <div style={{ background: 'var(--gxl)', borderRadius: 6, padding: 4, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--sr)', fontSize: 12, fontWeight: 800, color: 'var(--g)' }}>8</div>
                        <div style={{ fontSize: 5, fontWeight: 600, color: 'var(--mt)' }}>Activities</div>
                      </div>
                      <div style={{ background: 'var(--gxl)', borderRadius: 6, padding: 4, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--sr)', fontSize: 12, fontWeight: 800, color: 'var(--g)' }}>3</div>
                        <div style={{ fontSize: 5, fontWeight: 600, color: 'var(--mt)' }}>Clubs</div>
                      </div>
                      <div style={{ background: 'var(--gxl)', borderRadius: 6, padding: 4, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--sr)', fontSize: 12, fontWeight: 800, color: 'var(--acc)' }}>€245</div>
                        <div style={{ fontSize: 5, fontWeight: 600, color: 'var(--mt)' }}>Due soon</div>
                      </div>
                      <div style={{ background: 'var(--gxl)', borderRadius: 6, padding: 4, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--sr)', fontSize: 12, fontWeight: 800, color: 'var(--g)' }}>2</div>
                        <div style={{ fontSize: 5, fontWeight: 600, color: 'var(--mt)' }}>Kids</div>
                      </div>
                    </div>
                  </div>
                  {/* My Clubs card */}
                  <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--bd)', padding: 8, marginBottom: 6 }}>
                    <div style={{ fontFamily: 'var(--sr)', fontSize: 8, fontWeight: 700, color: 'var(--g)', marginBottom: 6 }}>My Clubs</div>
                    {[
                      { c: '#2d7cb5', ini: 'GA', name: 'GAA', who: 'Cooper', term: '11 Apr – 26 Jun' },
                      { c: '#2d5a3f', ini: 'Tr', name: 'Gym', who: 'Penny', term: '11 Apr – 26 Jun' },
                      { c: '#c4960c', ini: 'Te', name: 'Tennis', who: 'Dave', term: '' },
                    ].map((cl, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: i < 2 ? '1px solid var(--bd)' : 'none' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, background: cl.c, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 6, fontWeight: 800 }}>{cl.ini}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 7, fontWeight: 600, color: 'var(--tx)' }}>{cl.name}</div>
                          <div style={{ fontSize: 5, color: 'var(--mt)' }}>{cl.who}{cl.term ? ' · ' + cl.term : ''}</div>
                        </div>
                        <span style={{ fontSize: 8, color: '#ddd' }}>›</span>
                      </div>
                    ))}
                  </div>
                  {/* Alert */}
                  <div style={{ background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca', padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 8 }}>⚠️</span>
                    <span style={{ fontSize: 5, fontWeight: 600, color: '#dc2626' }}>1 clash this week: Tue 16:30</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mt)', marginTop: 10 }}>Overview dashboard</div>
            </div>

            {/* MOCKUP 3: Camp Finder */}
            <div style={{ flexShrink: 0, scrollSnapAlign: 'center' }}>
              <div style={{ width: 220, borderRadius: 24, border: '3px solid #1a1a1a', overflow: 'hidden', background: '#f8f6f3', boxShadow: '0 16px 48px rgba(0,0,0,.15)' }}>
                <div style={{ width: 60, height: 14, background: '#1a1a1a', borderRadius: '0 0 10px 10px', margin: '0 auto' }} />
                <div style={{ padding: '8px 10px 12px' }}>
                  {/* Mini header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--sr)', fontSize: 9, fontWeight: 800, color: 'var(--g)' }}>OneClubView</span>
                    <div style={{ width: 16, height: 16, borderRadius: 5, background: 'var(--g)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 700 }}>D</div>
                  </div>
                  {/* Tabs */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', marginBottom: 6 }}>
                    {['Overview', 'Schedule', 'Money', 'Explore'].map((t, i) => (
                      <span key={t} style={{ flex: 1, fontSize: 6, fontWeight: 600, color: i === 3 ? 'var(--g)' : 'var(--mt)', textAlign: 'center', padding: '4px 0 3px', borderBottom: i === 3 ? '1.5px solid var(--g)' : 'none' }}>{t}</span>
                    ))}
                  </div>
                  {/* Sub-tabs */}
                  <div style={{ display: 'flex', gap: 0, marginBottom: 6, borderBottom: '1px solid var(--bd)' }}>
                    {['My Clubs', 'Camps', 'Discover'].map((t, i) => (
                      <span key={t} style={{ flex: 1, fontSize: 6, fontWeight: 600, padding: '3px 0', textAlign: 'center', color: i === 1 ? 'var(--g)' : 'var(--mt)', borderBottom: i === 1 ? '1.5px solid var(--acc)' : 'none' }}>{t}</span>
                    ))}
                  </div>
                  {/* Location filters */}
                  <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                    <span style={{ fontSize: 5, fontWeight: 600, padding: '2px 5px', borderRadius: 5, background: 'var(--g)', color: '#fff' }}>Current</span>
                    <span style={{ fontSize: 5, fontWeight: 600, padding: '2px 5px', borderRadius: 5, background: '#fff', color: 'var(--mt)', border: '1px solid var(--bd)' }}>Home</span>
                    <span style={{ fontSize: 5, fontWeight: 600, padding: '2px 5px', borderRadius: 5, background: '#16a34a', color: '#fff' }}>Work</span>
                  </div>
                  {/* Holiday coverage */}
                  <div style={{ background: '#fff', borderRadius: 6, border: '1px solid var(--bd)', padding: 6, marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 6, fontWeight: 700, color: 'var(--g)' }}>Holiday coverage</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 6, fontWeight: 600, color: 'var(--tx)' }}>Easter Break</span>
                      <span style={{ fontSize: 5, fontWeight: 700, color: 'var(--acc)', background: 'var(--accl)', padding: '1px 5px', borderRadius: 4 }}>Not covered</span>
                    </div>
                  </div>
                  {/* Easter Break header */}
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--g)' }}>🐣 Easter Break</span>
                      <span style={{ fontSize: 5, fontWeight: 600, color: 'var(--acc)' }}>Edit dates</span>
                    </div>
                    <div style={{ fontSize: 5, color: 'var(--mt)', marginTop: 1 }}>27 Mar – 10 Apr · 52 camps found</div>
                  </div>
                  {/* Camp card */}
                  <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--bd)', padding: 6, marginBottom: 4 }}>
                    <div style={{ fontSize: 7, fontWeight: 700, color: 'var(--g)', marginBottom: 2 }}>STARCAMP Easter – Blackrock</div>
                    <div style={{ fontSize: 5, color: 'var(--mt)', marginBottom: 2 }}>Willow Park · 30 Mar – 2 Apr · 09:00–14:00</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 5, fontWeight: 700, color: 'var(--acc)' }}>€117</span>
                      <span style={{ fontSize: 5, color: 'var(--mt)' }}>Ages 4-12</span>
                      <span style={{ fontSize: 5, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '1px 4px', borderRadius: 3 }}>Suits Penny, Cooper</span>
                    </div>
                    <div style={{ fontSize: 5, color: 'var(--mt)', marginTop: 3, fontStyle: 'italic' }}>🏫 2 families from 2nd Class booked this</div>
                    <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                      <span style={{ fontSize: 5, fontWeight: 600, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--bd)', color: 'var(--mt)' }}>❤️ Interested</span>
                      <span style={{ fontSize: 5, fontWeight: 600, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--g)', color: 'var(--g)' }}>Mark booked</span>
                    </div>
                  </div>
                  {/* Second camp */}
                  <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--bd)', padding: 6 }}>
                    <div style={{ fontSize: 7, fontWeight: 700, color: 'var(--g)', marginBottom: 2 }}>Multi-Sport Easter Camp</div>
                    <div style={{ fontSize: 5, color: 'var(--mt)', marginBottom: 2 }}>Bull Island · 31 Mar – 3 Apr · 09:30–15:00</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 5, fontWeight: 700, color: 'var(--acc)' }}>€140</span>
                      <span style={{ fontSize: 5, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '1px 4px', borderRadius: 3 }}>Covers work day</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mt)', marginTop: 10 }}>Camp finder</div>
            </div>

          </div>
        </div>
      </section>
      {/* CLASSMATE FEATURE */}
      <section style={{ background: 'linear-gradient(135deg, #1a2a3a, #2d4a5f)', padding: '56px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
          <h2 style={{ fontFamily: "var(--sr)", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>The classmate feature</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', marginBottom: 20, lineHeight: 1.6 }}>
            Add your child's school and class. When families from the same class book a camp, you see an anonymous nudge — no names, just the count.
          </p>
          <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: '14px 20px', fontSize: 14, fontStyle: 'italic', color: 'rgba(255,255,255,.9)' }}>
            "2 families from 2nd Class at Scoil Bhríde booked this camp"
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 12 }}>
            The social proof that makes you click "Book" before it fills up.
          </p>
        </div>
      </section>
      {/* PRICING */}
      <section style={{ padding: '56px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e85d4a', textTransform: 'uppercase', letterSpacing: 1 }}>Simple pricing</span>
            <h2 style={{ fontFamily: "var(--sr)", fontSize: 'clamp(24px,4vw,32px)', fontWeight: 800, color: 'var(--g)', margin: '8px 0 4px' }}>
              14 days free. Then pick your plan.
            </h2>
            <p style={{ fontSize: 14, color: 'var(--mt)' }}>Cancel anytime. No lock-in.</p>
          </div>
          <div className="ocv-pricing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Standard */}
            <div style={{ background: 'var(--warm)', borderRadius: 20, padding: 24, border: '2px solid var(--bd)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Standard
              </div>
              <div style={{ fontFamily: "var(--sr)", fontSize: 28, fontWeight: 800, color: 'var(--g)' }}>
                €7.99
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mt)' }}>/mo</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--mt)', margin: '12px 0 16px', lineHeight: 1.5 }}>Perfect for most families</div>
              {['2 adults', '3 kids', 'All clubs & events', 'Fee tracking', 'Camp finder', 'Email forwarding', 'Clash detection'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx)', marginBottom: 6 }}>
                  <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 13 }}>✓</span>
                  {f}
                </div>
              ))}
              <button
                onClick={onGo}
                className="btn bp"
                style={{
                  width: '100%',
                  marginTop: 16,
                  fontSize: 13,
                  background: 'var(--g)',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(26,42,58,.2)',
                  padding: '16px',
                  borderRadius: 'var(--radius)',
                  minHeight: 48,
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "var(--sn)",
                  transition: 'transform .15s,box-shadow .15s'
                }}
              >
                Start free trial
              </button>
            </div>
            {/* Family+ */}
            <div style={{ background: 'var(--g)', borderRadius: 20, padding: 24, border: '2px solid var(--g)', color: '#fff', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -10, right: 16, background: 'var(--acc)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
                BEST VALUE
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Family+
              </div>
              <div style={{ fontFamily: "var(--sr)", fontSize: 28, fontWeight: 800 }}>
                €14.99
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.6)' }}>/mo</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', margin: '12px 0 16px', lineHeight: 1.5 }}>
                Bigger families, more flexibility
              </div>
              {['Up to 4 adults', '6 kids', 'Everything in Standard', 'Shared with grandparents', 'Multi-household support', 'Priority support'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,.9)', marginBottom: 6 }}>
                  <span style={{ color: '#e85d4a', fontWeight: 700, fontSize: 13 }}>✓</span>
                  {f}
                </div>
              ))}
              <button
                onClick={onGo}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '12px 0',
                  borderRadius: 14,
                  border: '2px solid rgba(255,255,255,.3)',
                  background: 'transparent',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "var(--sn)"
                }}
              >
                Start free trial
              </button>
            </div>
          </div>
        </div>
      </section>
      <footer style={{ padding: '24px', background: 'var(--g)', textAlign: 'center' }}>
        <Logo dark />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          <a href="/blog/manage-kids-clubs" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            Managing Clubs
          </a>
          <a href="/blog/easter-camps-dublin-2026" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            Easter Camps
          </a>
          <a href="/blog/family-calendar-app" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            Family Calendar
          </a>
          <a href="/blog/whatsapp-groups-kids-clubs" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            WhatsApp Groups
          </a>
          <a href="/blog/kids-activities-cost-ireland" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            Activities Cost
          </a>
          <a href="/blog/over-scheduling-kids-activities" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            Over-Scheduling
          </a>
          <a href="/blog/managing-kids-activities-ireland" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            Activity Schedules
          </a>
          <a href="/blog/how-to-choose-summer-camp-ireland" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            Summer Camps
          </a>
          <a href="/privacy" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            Privacy
          </a>
          <a href="/terms" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
            Terms
          </a>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 8 }}>© 2026 OneClubView</p>
      </footer>
    </div>
  );
}

export default Landing;
