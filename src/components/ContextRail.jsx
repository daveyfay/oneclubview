import React, { useMemo, useState, useEffect } from 'react';
import { isToday } from '../lib/utils';
import { CC, COLS } from '../lib/constants';

function minutesUntil(timeStr) {
  if (!timeStr) return Infinity;
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
}

export default function ContextRail({
  weekEvts, pays, isAdmin, profile, onChangeTab, getMemberCol, kids,
}) {
  const [now, setNow] = useState(() => new Date());

  // Update every 60s for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Next upcoming event today
  const nextUp = useMemo(() => {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return (weekEvts || [])
      .filter(e => !e.skipped && isToday(e.date) && e.time && e.source_type !== 'payment')
      .filter(e => {
        const [h, m] = e.time.split(':').map(Number);
        return h * 60 + m > nowMins;
      })
      .sort((a, b) => a.time.localeCompare(b.time))[0] || null;
  }, [weekEvts, now]);

  // Countdown text
  const countdown = useMemo(() => {
    if (!nextUp) return '';
    const mins = minutesUntil(nextUp.time);
    if (mins <= 0) return 'NOW';
    if (mins < 60) return `IN ${mins}M`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `IN ${h}H ${m}M` : `IN ${h}H`;
  }, [nextUp, now]);

  // Outstanding fees
  const unpaidPays = useMemo(() => {
    return (pays || []).filter(p => !p.paid && p.status !== 'not_renewing');
  }, [pays]);

  const totalDue = unpaidPays.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const overdueCount = unpaidPays.filter(p => p.due_date && new Date(p.due_date) < now).length;
  const isOverdue = overdueCount > 0;

  // Events needing a driver (this week, no driver assigned)
  const needsDriver = useMemo(() => {
    return (weekEvts || [])
      .filter(e => !e.skipped && !e.driver && e.time && e.source_type !== 'payment')
      .sort((a, b) => {
        const dc = (a.date || '').localeCompare(b.date || '');
        return dc !== 0 ? dc : (a.time || '').localeCompare(b.time || '');
      })[0] || null;
  }, [weekEvts]);

  // Format day name for needs-driver card
  const needsDriverDay = useMemo(() => {
    if (!needsDriver?.date) return '';
    const d = new Date(needsDriver.date + 'T00:00:00');
    if (isToday(needsDriver.date)) return 'Today';
    return d.toLocaleDateString('en-IE', { weekday: 'short' });
  }, [needsDriver]);

  // Term progress from pays data
  const termProgress = useMemo(() => {
    if (!pays || pays.length === 0) return null;
    const total = pays.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const paid = pays.filter(p => p.paid).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    if (total === 0) return null;
    return { paid, total, pct: Math.min(100, Math.round((paid / total) * 100)) };
  }, [pays]);

  return (
    <aside className="context-rail">
      {/* 1. Up Next card */}
      {nextUp && (
        <div
          className="ocv-rise"
          onClick={() => onChangeTab('week')}
          style={{
            background: '#1a2a3a',
            borderRadius: 26,
            padding: '24px 22px 20px',
            cursor: 'pointer',
          }}
        >
          {/* Top labels */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '.16em',
              color: '#8fa8bd',
            }}>UP NEXT</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '.16em',
              color: '#8fa8bd',
            }}>{countdown}</span>
          </div>

          {/* Activity name */}
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 27,
            fontWeight: 700,
            color: '#f4f7fa',
            lineHeight: 1.15,
            marginTop: 10,
          }}>
            {nextUp.club || nextUp.title}
          </div>

          {/* Meta line */}
          <div style={{
            fontSize: 14.5,
            color: '#c3d3e0',
            marginTop: 6,
          }}>
            {nextUp.member}
            {' \u00B7 '}
            {nextUp.time}
            {nextUp.endTime && `\u2013${nextUp.endTime}`}
            {nextUp.location && ` \u00B7 ${nextUp.location}`}
          </div>

          {/* Hairline divider */}
          <div style={{
            height: 1,
            background: 'rgba(244,247,250,.18)',
            margin: '14px 0',
          }} />

          {/* Footer: driver info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {nextUp.driver ? (
                <>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: 'var(--color-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    {(nextUp.driver === 'You' ? (profile?.first_name || 'Y') : nextUp.driver)[0]}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#f4f7fa' }}>
                    {nextUp.driver === profile?.first_name || nextUp.driver === 'You'
                      ? "You're driving"
                      : `${nextUp.driver} is driving`}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-accent)' }}>
                  No driver yet
                </span>
              )}
            </div>
            {nextUp.travel_time && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: '#8fa8bd',
              }}>{nextUp.travel_time}</span>
            )}
          </div>
        </div>
      )}

      {/* 2. Outstanding fees strip */}
      {isAdmin && totalDue > 0 && (
        <div
          onClick={() => onChangeTab('money')}
          style={{
            borderRadius: 20,
            padding: '17px 19px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            background: isOverdue ? 'var(--color-accent-bg)' : 'var(--color-primary-bg)',
            border: isOverdue ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{
              fontSize: 15,
              fontWeight: 600,
              color: isOverdue ? 'var(--color-accent)' : 'var(--color-primary)',
            }}>
              {CC.currency}{totalDue.toFixed(0)} outstanding
            </span>
            {overdueCount > 0 && (
              <span style={{
                fontSize: 12,
                color: '#c14a37',
                marginLeft: 6,
              }}>
                {'\u00B7'} {overdueCount} overdue
              </span>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isOverdue ? 'var(--color-accent)' : 'var(--color-primary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      )}

      {/* 3. Needs a driver card */}
      {needsDriver && (
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          padding: '20px 19px',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '.16em',
            color: '#c14a37',
            marginBottom: 10,
          }}>
            NEEDS A DRIVER
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: 4,
          }}>
            {needsDriver.club || needsDriver.title}
          </div>
          <div style={{
            fontSize: 13,
            color: '#6b7480',
            marginBottom: 14,
          }}>
            {needsDriver.member}
            {' \u00B7 '}
            {needsDriverDay} {needsDriver.time}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeTab('week');
            }}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 12,
              minHeight: 44,
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            I'll take it
          </button>
        </div>
      )}

      {/* 4. Term progress */}
      {isAdmin && termProgress && (
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '.16em',
            color: 'var(--color-muted)',
            marginBottom: 10,
          }}>
            AUTUMN TERM
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Paid so far</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
              {CC.currency}{termProgress.paid.toFixed(0)} paid of {CC.currency}{termProgress.total.toFixed(0)}
            </span>
          </div>
          <div style={{
            height: 7,
            borderRadius: 4,
            background: 'var(--color-primary-bg)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              borderRadius: 4,
              background: '#2d4a5f',
              width: `${termProgress.pct}%`,
              transition: 'width .6s ease',
            }} />
          </div>
        </div>
      )}
    </aside>
  );
}
