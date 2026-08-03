import React, { useState, useMemo, useCallback } from 'react';
import { useHubData } from '../../hooks/useHubData';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import ErrorBoundary from '../../components/ErrorBoundary';
import EventDetailModal from '../../components/modals/EventDetailModal';
import ActivitySheet from '../../components/ActivitySheet';
import ICN from '../../lib/icons';
import { COLS } from '../../lib/constants';
import { isToday, showToast } from '../../lib/utils';
import { db } from '../../lib/supabase';

/* ── Styles ── */
const s = {
  eyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '.16em',
    color: 'var(--color-muted)',
    margin: 0,
  },
  title: {
    fontFamily: 'var(--font-serif)',
    fontSize: 38,
    fontWeight: 700,
    color: 'var(--color-primary)',
    letterSpacing: '-.02em',
    lineHeight: 1.1,
    margin: '2px 0 0',
  },
  summary: {
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
  card: {
    background: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 14,
    padding: '11px 13px',
    cursor: 'pointer',
    transition: 'transform .1s',
    display: 'flex',
    alignItems: 'stretch',
    gap: 0,
    overflow: 'hidden',
  },
  clash: {
    background: 'var(--color-accent-bg)',
    border: '1px solid #f9c9c1',
    borderRadius: 12,
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
};

/* ── Helpers ── */
function parseMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function formatDateRange(wd) {
  if (!wd || wd.length < 7) return '';
  const start = wd[0];
  const end = wd[6];
  const sMonth = start.toLocaleDateString('en-IE', { month: 'long' });
  const eMonth = end.toLocaleDateString('en-IE', { month: 'long' });
  if (sMonth === eMonth) {
    return `${start.getDate()} \u2013 ${end.getDate()} ${sMonth}`;
  }
  return `${start.getDate()} ${sMonth.slice(0, 3)} \u2013 ${end.getDate()} ${eMonth.slice(0, 3)}`;
}

function detectClashes(dayEvts) {
  const clashes = [];
  for (let i = 0; i < dayEvts.length; i++) {
    for (let j = i + 1; j < dayEvts.length; j++) {
      const a = dayEvts[i], b = dayEvts[j];
      const aMin = parseMinutes(a.time);
      const bMin = parseMinutes(b.time);
      if (aMin === null || bMin === null) continue;
      if (Math.abs(aMin - bMin) < 60 && (!a.driver || !b.driver)) {
        const noDriver = !a.driver ? a : b;
        clashes.push({
          message: `Two runs at once \u2014 nobody assigned to ${noDriver.club || noDriver.title || 'an activity'}`,
        });
      }
    }
  }
  return clashes;
}

/* ── Desktop Column Card ── */
function DesktopCard({ evt, getMemberCol, onClick }) {
  const col = getMemberCol(evt.memberId, evt.colour);
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '10px 10px 8px',
        cursor: 'pointer',
        transition: 'transform .1s',
        overflow: 'hidden',
      }}
      onTouchStart={ev => ev.currentTarget.style.transform = 'scale(.97)'}
      onTouchEnd={ev => ev.currentTarget.style.transform = ''}
    >
      <div style={{ width: 22, height: 3, borderRadius: 2, background: col, marginBottom: 6 }} />
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.25, marginBottom: 3 }}>
        {evt.club || evt.title || ''}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-primary)', marginBottom: 2 }}>
        {evt.time || ''}{evt.endTime ? '\u2013' + evt.endTime : ''}
      </div>
      <div style={{ fontSize: 11.5, color: '#6b7480', lineHeight: 1.3 }}>
        {evt.member}{evt.driver ? ` \u00B7 ${evt.driver}` : ' \u00B7 no driver'}
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function WeekTab({ filter }) {
  const {
    kids, weekEvts, profile, loading, recs,
    isAdmin, getMemberCol, members, wd,
    holidays, pays, familyMembers, user, load,
    clubs, clubMap, clubTermMap, kidMap,
  } = useHubData();

  const isDesktop = useIsDesktop();
  const [localFilter, setLocalFilter] = useState(null);
  const [tapEvent, setTapEvent] = useState(null);
  const [sheetEvent, setSheetEvent] = useState(null);

  const activeFilter = localFilter !== null ? localFilter : filter;

  /* ── Filtered events ── */
  const filtEvts = useMemo(() => {
    const active = weekEvts.filter(e => !e.skipped);
    if (activeFilter === 'all') return active;
    return active.filter(e => e.memberId === activeFilter);
  }, [weekEvts, activeFilter]);

  /* ── Group events by day ── */
  const dayMap = useMemo(() => {
    const map = new Map();
    (wd || []).forEach(d => {
      const key = d.toDateString();
      map.set(key, []);
    });
    filtEvts.forEach(evt => {
      const key = evt.date.toDateString();
      if (map.has(key)) {
        map.get(key).push(evt);
      }
    });
    // Sort each day by time
    map.forEach((evts) => {
      evts.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    });
    return map;
  }, [wd, filtEvts]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const totalActivities = filtEvts.length;
    const daysWithEvents = new Set();
    let clashCount = 0;
    filtEvts.forEach(e => daysWithEvents.add(e.date.toDateString()));

    (wd || []).forEach(d => {
      const dayEvts = dayMap.get(d.toDateString()) || [];
      const clashes = detectClashes(dayEvts);
      clashCount += clashes.length;
    });

    return { totalActivities, daysWithEvents: daysWithEvents.size, clashCount };
  }, [filtEvts, wd, dayMap]);

  const handleTapEvent = useCallback((e) => {
    if (e.source_type === 'payment' || e.isPayment) {
      setTapEvent(e);
    } else {
      setSheetEvent(e);
    }
  }, []);

  /* ── Loading skeleton ── */
  if (loading) return (
    <ErrorBoundary label="Week">
      <div style={{ padding: '4px 0' }}>
        <div className="skeleton-shimmer" style={{ width: 120, height: 12, borderRadius: 4, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ width: 180, height: 36, borderRadius: 8, marginBottom: 10 }} />
        <div className="skeleton-shimmer" style={{ width: 240, height: 14, borderRadius: 4, marginBottom: 20 }} />
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div className="skeleton-shimmer" style={{ width: 44, height: 44, borderRadius: 8 }} />
            <div className="skeleton-shimmer" style={{ flex: 1, height: 64, borderRadius: 14 }} />
          </div>
        ))}
      </div>
    </ErrorBoundary>
  );

  /* ── Summary text ── */
  const summaryText = stats.totalActivities === 0
    ? 'Nothing scheduled this week.'
    : `${stats.totalActivities} activit${stats.totalActivities === 1 ? 'y' : 'ies'} across ${stats.daysWithEvents} day${stats.daysWithEvents === 1 ? '' : 's'}${stats.clashCount > 0 ? ` \u00B7 ${stats.clashCount} clash${stats.clashCount === 1 ? '' : 'es'} to sort.` : '.'}`;

  /* ── Desktop 7-column grid ── */
  const renderDesktopGrid = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginTop: 20 }}>
      {(wd || []).map(d => {
        const key = d.toDateString();
        const dayEvts = dayMap.get(key) || [];
        const today = isToday(d);
        const dayAbbr = d.toLocaleDateString('en-IE', { weekday: 'short' }).slice(0, 3);
        const clashes = detectClashes(dayEvts);

        return (
          <div key={key} style={{ minHeight: 120 }}>
            {/* Column header */}
            <div style={{
              borderBottom: today ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              paddingBottom: 6,
              marginBottom: 8,
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                color: today ? 'var(--color-primary)' : '#bcc2c8',
              }}>{dayAbbr}</div>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                fontWeight: 700,
                color: today ? 'var(--color-primary)' : '#bcc2c8',
              }}>{d.getDate()}</div>
            </div>

            {/* Events */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dayEvts.length === 0 ? (
                <div style={{ fontSize: 12, color: '#a8afb7', textAlign: 'center', padding: '8px 0' }}>Free</div>
              ) : dayEvts.map((evt, i) => (
                <DesktopCard key={evt.id || i} evt={evt} getMemberCol={getMemberCol} onClick={() => handleTapEvent(evt)} />
              ))}
              {clashes.map((c, ci) => (
                <div key={'clash-' + ci} style={s.clash}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e85d4a', flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#c14a37', lineHeight: 1.3 }}>{c.message}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── Mobile day-by-day timeline ── */
  const renderMobileTimeline = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
      {(wd || []).map(d => {
        const key = d.toDateString();
        const dayEvts = dayMap.get(key) || [];
        const today = isToday(d);
        const dayAbbr = d.toLocaleDateString('en-IE', { weekday: 'short' }).slice(0, 3).toUpperCase();
        const clashes = detectClashes(dayEvts);

        // Skip empty non-today days
        if (dayEvts.length === 0 && !today) return null;

        return (
          <div key={key} style={{ display: 'flex', gap: 12 }}>
            {/* Left: date column */}
            <div style={{ width: 44, flexShrink: 0, textAlign: 'center', paddingTop: 2 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                color: today ? 'var(--color-primary)' : '#bcc2c8',
              }}>{dayAbbr}</div>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 23,
                fontWeight: 700,
                color: today ? 'var(--color-primary)' : '#bcc2c8',
                lineHeight: 1.1,
              }}>{d.getDate()}</div>
            </div>

            {/* Right: event cards */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayEvts.length === 0 ? (
                <div style={{ fontSize: 14, color: '#a8afb7', padding: '8px 0' }}>
                  Nothing on &mdash; a free evening.
                </div>
              ) : (
                <>
                  {dayEvts.map((evt, i) => {
                    const col = getMemberCol(evt.memberId, evt.colour);
                    return (
                      <div
                        key={evt.id || i}
                        style={s.card}
                        onClick={() => handleTapEvent(evt)}
                        onTouchStart={ev => ev.currentTarget.style.transform = 'scale(.98)'}
                        onTouchEnd={ev => ev.currentTarget.style.transform = ''}
                      >
                        {/* Color bar */}
                        <div style={{ width: 3, background: col, flexShrink: 0, borderRadius: '3px 0 0 3px' }} />
                        {/* Content */}
                        <div style={{ flex: 1, padding: '0 0 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>
                              {evt.club || evt.title || ''}
                            </div>
                            <div style={{ fontSize: 12.5, color: '#6b7480', marginTop: 1 }}>
                              {evt.member}{evt.driver ? ` \u00B7 ${evt.driver}` : ' \u00B7 no driver'}
                            </div>
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 13,
                            color: 'var(--color-primary)',
                            flexShrink: 0,
                            textAlign: 'right',
                          }}>
                            {evt.time || ''}{evt.endTime ? '\u2013' + evt.endTime : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Clash callouts */}
                  {clashes.map((c, ci) => (
                    <div key={'clash-' + ci} style={s.clash}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e85d4a', flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#c14a37', lineHeight: 1.3 }}>{c.message}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <ErrorBoundary label="Week">
      <div>
        {/* 1. Eyebrow */}
        <p style={s.eyebrow}>{formatDateRange(wd)}</p>

        {/* 2. Title */}
        <h2 style={s.title}>This week</h2>

        {/* 3. Summary */}
        <p style={s.summary}>{summaryText}</p>

        {/* 4. Kid filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '18px 0 20px' }}>
          {members.map((m) => {
            const isActive = activeFilter === m.id;
            const dotColor = m.type === 'kid'
              ? COLS[kids.findIndex(k => k.id === m.id) % COLS.length]
              : m.type === 'self' ? 'var(--color-primary)'
              : m.type === 'adult' ? '#8b5cf6'
              : null;

            return (
              <button
                key={m.id}
                onClick={() => setLocalFilter(activeFilter === m.id && m.id !== 'all' ? 'all' : m.id)}
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

        {/* 5. Day-by-day timeline or desktop grid */}
        {isDesktop ? renderDesktopGrid() : renderMobileTimeline()}

        {/* Forward club emails banner */}
        <div style={{ background: 'var(--color-primary)', borderRadius: 14, padding: 16, marginTop: 16, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: 'rgba(255,255,255,.5)' }}>{ICN.mail}</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Forward club emails</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)', marginBottom: 3 }}>{'\u{1F4E7}'} Email from a club?</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', lineHeight: 1.3 }}>Forward it to:</div>
              <span
                onClick={() => navigator.clipboard?.writeText('schedule@geovoriofi.resend.app')}
                style={{ display: 'inline-block', padding: '4px 8px', background: 'rgba(255,255,255,.1)', borderRadius: 5, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 4, cursor: 'pointer' }}
              >schedule@geovoriofi.resend.app {'\u{1F4CB}'}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', marginBottom: 3 }}>{'\u{1F4AC}'} WhatsApp from a coach?</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', lineHeight: 1.3 }}>Long-press message {'\u2192'} Share {'\u2192'} Mail {'\u2192'} forward to the address above</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 8 }}>We auto-update your schedule, fees, and terms.</div>
        </div>

        {/* Activity bottom sheet (non-payment events) */}
        <ActivitySheet
          event={sheetEvent}
          open={!!sheetEvent}
          onClose={() => setSheetEvent(null)}
          profile={profile}
          load={load}
          adults={[...new Set([profile?.first_name || 'Me', ...familyMembers.filter(m => m.id !== user.id && !kids.find(k => k.first_name === m.first_name)).map(m => m.first_name)].filter(Boolean))]}
          onDriverChange={async (ev, driver) => {
            if (ev.source_type === 'recurring') {
              await db('recurring_events', 'PATCH', { filters: ['id=eq.' + ev.source_id], body: { driver } });
              showToast(driver + ' is driving');
              load();
            }
          }}
          onDelete={async (ev) => {
            if (ev.source_type === 'manual') {
              await db('manual_events', 'DELETE', { filters: ['id=eq.' + ev.source_id] });
              showToast('Removed from schedule');
              load();
            } else if (ev.source_type === 'recurring') {
              const dateStr = ev.date.toISOString().split('T')[0];
              const rec = recs.find(r => r.id === ev.source_id);
              const excluded = [...(rec?.excluded_dates || []), dateStr];
              await db('recurring_events', 'PATCH', { filters: ['id=eq.' + ev.source_id], body: { excluded_dates: excluded } });
              showToast('Skipped for this week');
              load();
            }
          }}
        />

        {/* EventDetailModal (payment events only) */}
        <EventDetailModal
          event={tapEvent}
          open={!!tapEvent}
          onClose={() => setTapEvent(null)}
          load={load}
          getMemberCol={getMemberCol}
          adults={[...new Set([profile?.first_name || 'Me', ...familyMembers.filter(m => m.id !== user.id && !kids.find(k => k.first_name === m.first_name)).map(m => m.first_name)].filter(Boolean))]}
          familyAll={[...new Set([profile?.first_name || 'Me', ...kids.map(k => k.first_name), ...familyMembers.filter(m => m.id !== user.id).map(m => m.first_name)].filter(Boolean))]}
          onDriverChange={async (ev, driver) => {
            if (ev.source_type === 'recurring') {
              await db('recurring_events', 'PATCH', { filters: ['id=eq.' + ev.source_id], body: { driver } });
              showToast(driver + ' is driving');
              setTapEvent({ ...ev, driver });
              load();
            }
          }}
          onAttendeesChange={async (ev, attendees) => {
            if (ev.source_type === 'manual' && ev.source_id) {
              await db('manual_events', 'PATCH', { filters: ['id=eq.' + ev.source_id], body: { description: attendees.length > 0 ? 'Going: ' + attendees.join(', ') : '' } });
            }
          }}
          onDelete={async (ev) => {
            if (ev.source_type === 'manual') {
              await db('manual_events', 'DELETE', { filters: ['id=eq.' + ev.source_id] });
              showToast('Removed from schedule');
              setTapEvent(null);
              load();
            } else if (ev.source_type === 'recurring') {
              const dateStr = ev.date.toISOString().split('T')[0];
              const rec = recs.find(r => r.id === ev.source_id);
              const excluded = [...(rec?.excluded_dates || []), dateStr];
              await db('recurring_events', 'PATCH', { filters: ['id=eq.' + ev.source_id], body: { excluded_dates: excluded } });
              showToast('Skipped for this week');
              setTapEvent(null);
              load();
            }
          }}
          onMarkPaid={async (ev) => {
            if (ev.source_type === 'payment' && ev.source_id) {
              await db('payment_reminders', 'PATCH', { filters: ['id=eq.' + ev.source_id], body: { paid: true, paid_at: new Date().toISOString() } });
              showToast('Marked as paid!');
              setTapEvent(null);
              load();
            }
          }}
          onColourChange={async (ev, col) => {
            if (ev.source_type !== 'manual') return;
            await db('manual_events', 'PATCH', { filters: ['id=eq.' + ev.source_id], body: { colour: col } });
            setTapEvent({ ...ev, colour: col });
            load();
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
