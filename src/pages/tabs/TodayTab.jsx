import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useHubData } from '../../hooks/useHubData';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import ErrorBoundary from '../../components/ErrorBoundary';
import { COLS, CC } from '../../lib/constants';
import { isToday } from '../../lib/utils';

function minutesUntil(timeStr) {
  if (!timeStr) return Infinity;
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
}

function formatDateEyebrow() {
  const d = new Date();
  const day = d.toLocaleDateString('en-IE', { weekday: 'short' });
  const date = d.getDate();
  const month = d.toLocaleDateString('en-IE', { month: 'long' });
  return `${day} ${date} ${month}`;
}

// ── Styles ──

const s = {
  eyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '.16em',
    color: 'var(--color-muted)',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'var(--font-serif)',
    fontSize: 38,
    fontWeight: 700,
    color: 'var(--color-primary)',
    letterSpacing: '-.02em',
    lineHeight: 1.1,
    margin: 0,
  },
  summary: {
    fontFamily: 'var(--font-sans)',
    fontSize: 15,
    color: 'var(--color-muted)',
    marginTop: 6,
    lineHeight: 1.45,
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 15px',
    minHeight: 38,
    borderRadius: 100,
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: 'var(--font-sans)',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all .15s',
  },
  heroCard: {
    background: 'var(--color-primary)',
    borderRadius: 26,
    padding: '24px 22px 20px',
  },
  heroLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '.16em',
    color: '#8fa8bd',
  },
  heroName: {
    fontFamily: 'var(--font-serif)',
    fontSize: 32,
    fontWeight: 700,
    color: '#f4f7fa',
    lineHeight: 1.15,
    marginTop: 10,
  },
  heroMeta: {
    fontSize: 13.5,
    color: '#c3d3e0',
    marginTop: 6,
  },
  heroDivider: {
    height: 1,
    background: 'rgba(244,247,250,.18)',
    margin: '14px 0',
  },
  timelineEyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '.16em',
    color: 'var(--color-muted)',
    marginBottom: 14,
    marginTop: 28,
  },
  timelineRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 0,
    cursor: 'pointer',
    padding: '10px 0',
  },
  timelineTime: {
    width: 46,
    textAlign: 'right',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-muted)',
    paddingTop: 2,
    flexShrink: 0,
  },
  timelineRail: {
    width: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 4,
  },
  feeStrip: {
    borderRadius: 20,
    padding: '17px 19px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    marginTop: 24,
  },
};

export default function TodayTab({ filter, onChangeTab, onRefresh }) {
  const {
    kids, pays, weekEvts, profile, loading,
    isAdmin, getMemberCol, members,
  } = useHubData();

  const isDesktop = useIsDesktop();

  const [now, setNow] = useState(() => new Date());

  // Countdown timer — update every 60s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Filter today's events, exclude skipped and past
  const todayEvts = useMemo(() => {
    const active = weekEvts.filter(e => !e.skipped && e.source_type !== 'payment');
    const filtered = filter === 'all' ? active : active.filter(e => e.memberId === filter);
    return filtered
      .filter(e => isToday(e.date) && e.time)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [weekEvts, filter, now]);

  // Split into upcoming (not past) events
  const upcoming = useMemo(() => {
    return todayEvts.filter(e => {
      const endStr = e.endTime || e.time;
      const [h, m] = endStr.split(':').map(Number);
      return (h * 60 + m) >= nowMins;
    });
  }, [todayEvts, nowMins]);

  // First upcoming = hero card, rest = timeline
  const heroEvt = upcoming.length > 0 ? upcoming[0] : null;
  const restEvts = upcoming.length > 1 ? upcoming.slice(1) : [];

  // Fees
  const unpaidPays = useMemo(() => {
    const fp = filter === 'all' ? pays : pays.filter(p => (p.dependant_id || 'self') === filter);
    return fp.filter(p => !p.paid && p.status !== 'not_renewing');
  }, [pays, filter]);

  const totalDue = unpaidPays.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const overdue = unpaidPays.some(p => p.due_date && new Date(p.due_date) < now);

  // Summary text
  const summaryText = useMemo(() => {
    if (todayEvts.length === 0) return 'Nothing on today \u2014 enjoy the free time.';
    const driverRuns = todayEvts.filter(e =>
      e.driver && (e.driver === profile?.first_name || e.driver === 'You')
    ).length;
    const parts = [`${todayEvts.length} activit${todayEvts.length === 1 ? 'y' : 'ies'}`];
    if (driverRuns > 0) parts.push(`${driverRuns} run${driverRuns === 1 ? '' : 's'} on you`);
    return parts.join(', ') + '.';
  }, [todayEvts, profile]);

  // Countdown text for hero
  const heroCountdown = useMemo(() => {
    if (!heroEvt) return '';
    const mins = minutesUntil(heroEvt.time);
    if (mins <= 0) return 'now';
    if (mins < 60) return `in ${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  }, [heroEvt, now]);

  const handleTapEvent = useCallback((evt) => {
    onChangeTab('week');
  }, [onChangeTab]);

  if (loading) return (
    <ErrorBoundary label="Today">
      <div style={{ padding: '4px 0' }}>
        <div className="skeleton-shimmer" style={{ width: '40%', height: 12, borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ width: '30%', height: 38, borderRadius: 8, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ width: '65%', height: 14, borderRadius: 6, marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
          {[70, 55, 55, 60].map((w, i) => <div key={i} className="skeleton-shimmer" style={{ width: w, height: 38, borderRadius: 100 }} />)}
        </div>
        <div className="skeleton-shimmer" style={{ height: 180, borderRadius: 26 }} />
      </div>
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary label="Today">
      {/* 1. Eyebrow + Title + Summary */}
      <div style={{ padding: '4px 0 0' }}>
        <div style={s.eyebrow}>{formatDateEyebrow()}</div>
        <h1 style={s.title}>Today</h1>
        <p style={s.summary}>{summaryText}</p>
      </div>

      {/* 2. Kid filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '18px 0 20px' }}>
        {members.map((m, mi) => {
          const isActive = filter === m.id;
          const dotColor = m.type === 'kid'
            ? COLS[kids.findIndex(k => k.id === m.id) % COLS.length]
            : m.type === 'self' ? 'var(--color-primary)'
            : m.type === 'adult' ? '#8b5cf6'
            : null;

          return (
            <button
              key={m.id}
              onClick={() => onRefresh(filter === m.id && m.id !== 'all' ? 'filter:all' : 'filter:' + m.id)}
              style={{
                ...s.chip,
                background: isActive ? 'var(--color-primary)' : '#fff',
                border: isActive ? 'none' : '1.5px solid var(--color-border)',
                color: isActive ? '#fff' : '#5a6470',
              }}
            >
              {m.type !== 'all' && (
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: isActive ? '#fff' : dotColor,
                  flexShrink: 0,
                }} />
              )}
              {m.name}
            </button>
          );
        })}
      </div>

      {/* 3. Up Next hero card — hidden on desktop (shown in ContextRail) */}
      {!isDesktop && heroEvt && (
        <div className="ocv-rise" style={s.heroCard} onClick={() => handleTapEvent(heroEvt)}>
          {/* Top labels */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={s.heroLabel}>UP NEXT</span>
            <span style={s.heroLabel}>{heroCountdown}</span>
          </div>

          {/* Activity name */}
          <div style={s.heroName}>{heroEvt.club || heroEvt.title}</div>

          {/* Meta line */}
          <div style={s.heroMeta}>
            {heroEvt.member}
            {' \u00B7 '}
            {heroEvt.time}
            {heroEvt.endTime && `\u2013${heroEvt.endTime}`}
            {heroEvt.location && ` \u00B7 ${heroEvt.location}`}
          </div>

          {/* Divider */}
          <div style={s.heroDivider} />

          {/* Footer: driver info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {heroEvt.driver ? (
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
                    {(heroEvt.driver === 'You' ? (profile?.first_name || 'Y') : heroEvt.driver)[0]}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#f4f7fa' }}>
                    {heroEvt.driver === profile?.first_name || heroEvt.driver === 'You'
                      ? "You're driving"
                      : `${heroEvt.driver} is driving`}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-accent)' }}>
                  No driver yet
                </span>
              )}
            </div>
            {heroEvt.travel_time && (
              <span style={{ ...s.heroLabel, fontSize: 12 }}>{heroEvt.travel_time}</span>
            )}
          </div>
        </div>
      )}

      {/* 4. Rest of the day timeline */}
      {restEvts.length > 0 && (
        <div>
          <div style={s.timelineEyebrow}>REST OF THE DAY</div>
          {restEvts.map((evt, i) => {
            const dotColor = getMemberCol(evt.memberId, evt.colour);
            const isLast = i === restEvts.length - 1;

            return (
              <div
                key={evt.id}
                style={s.timelineRow}
                onClick={() => handleTapEvent(evt)}
                role="button"
                tabIndex={0}
              >
                {/* Time column */}
                <div style={s.timelineTime}>
                  {evt.time?.slice(0, 5)}
                </div>

                {/* Rail: vertical line + dot */}
                <div style={s.timelineRail}>
                  {/* Dot */}
                  <div style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: dotColor,
                    border: '2px solid #fff',
                    boxShadow: '0 0 0 1px var(--color-border)',
                    flexShrink: 0,
                    marginTop: 4,
                    zIndex: 1,
                  }} />
                  {/* Vertical rule */}
                  {!isLast && (
                    <div style={{
                      width: 1,
                      flex: 1,
                      background: 'var(--color-border)',
                      marginTop: 4,
                    }} />
                  )}
                </div>

                {/* Content */}
                <div style={s.timelineContent}>
                  <div style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    lineHeight: 1.3,
                  }}>
                    {evt.club || evt.title}
                  </div>
                  <div style={{
                    fontSize: 13.5,
                    color: '#6b7480',
                    marginTop: 2,
                  }}>
                    {evt.member}
                    {evt.location && ` \u00B7 ${evt.location}`}
                  </div>

                  {/* Driver chip */}
                  {evt.driver ? (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 6,
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: 'var(--color-primary-bg)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                    }}>
                      {evt.driver === profile?.first_name || evt.driver === 'You'
                        ? "You're driving"
                        : `${evt.driver} is driving`}
                    </div>
                  ) : (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 6,
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: 'var(--color-accent-bg)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#c14a37',
                    }}>
                      No driver yet &mdash; tap to claim
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state when no events at all */}
      {upcoming.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px 16px',
          color: 'var(--color-muted)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F343}"}</div>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--color-primary)',
            marginBottom: 4,
          }}>
            Free day
          </div>
          <div style={{ fontSize: 14 }}>
            Nothing left on the calendar today. Enjoy!
          </div>
        </div>
      )}

      {/* 5. Outstanding fees strip — hidden on desktop (shown in ContextRail) */}
      {!isDesktop && isAdmin && totalDue > 0 && (
        <div
          onClick={() => onChangeTab('money')}
          style={{
            ...s.feeStrip,
            background: overdue ? 'var(--color-accent-bg)' : 'var(--color-primary-bg)',
            border: overdue ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{
              fontSize: 15,
              fontWeight: 600,
              color: overdue ? 'var(--color-accent)' : 'var(--color-primary)',
            }}>
              {CC.currency}{totalDue.toFixed(0)} outstanding
            </span>
            {overdue && (
              <span style={{
                fontSize: 12,
                color: '#c14a37',
                marginLeft: 6,
              }}>
                {'\u00B7'} overdue
              </span>
            )}
          </div>
          {/* Chevron */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={overdue ? 'var(--color-accent)' : 'var(--color-primary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      )}
    </ErrorBoundary>
  );
}
