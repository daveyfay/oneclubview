import React, { useMemo } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import AlertCallout from '../../components/AlertCallout';
import { COLS, CLUB_ICONS } from '../../lib/constants';
import { isToday } from '../../lib/utils';
import CountUp from '../../components/bits/CountUp';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function isTomorrow(d) {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function minutesUntil(timeStr) {
  if (!timeStr) return Infinity;
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
}

export default function HomeTab({ filter, onChangeTab, onRefresh }) {
  const {
    kids, clubs, pays, weekEvts, alerts, profile, loading,
    isAdmin, getMemberCol,
  } = useHubData();

  if (loading) return (
    <ErrorBoundary label="Home">
      <div style={{ padding: '4px 0' }}>
        <div className="skeleton-shimmer" style={{ width: '60%', height: 28, borderRadius: 8, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ width: '80%', height: 14, borderRadius: 6, marginBottom: 24 }} />
        <div className="bento-grid">
          {[0,1,2,3].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 80, borderRadius: 14 }} />)}
        </div>
      </div>
    </ErrorBoundary>
  );

  const activeWeekEvts = weekEvts.filter(e => !e.skipped && e.source_type !== 'payment');
  const filteredWeekEvts = filter === 'all' ? activeWeekEvts : activeWeekEvts.filter(e => e.memberId === filter);

  const todayEvts = filteredWeekEvts
    .filter(e => isToday(e.date) && e.time)
    .sort((a, b) => a.time.localeCompare(b.time));

  const tomorrowEvts = filteredWeekEvts
    .filter(e => isTomorrow(e.date) && e.time)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Only show remaining events (not past)
  const now = new Date();
  const remainingToday = todayEvts.filter(e => {
    const endStr = e.endTime || e.time;
    const [h, m] = endStr.split(':').map(Number);
    return (h * 60 + m) >= (now.getHours() * 60 + now.getMinutes());
  });

  // Fees due
  const filtPays = filter === 'all' ? pays : pays.filter(p => (p.dependant_id || 'self') === filter);
  const totalDue = filtPays.filter(p => !p.paid && p.status !== 'not_renewing').reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  // Natural language summary
  const summary = useMemo(() => {
    if (todayEvts.length === 0) return 'Free day -- nothing scheduled!';
    const parts = [];
    // Group by kid
    const byKid = {};
    todayEvts.forEach(e => {
      if (!byKid[e.member]) byKid[e.member] = [];
      byKid[e.member].push(e);
    });
    const kidNames = Object.keys(byKid);
    kidNames.forEach((name, i) => {
      const evts = byKid[name];
      if (evts.length === 1) {
        parts.push(name + ' has ' + evts[0].club + ' at ' + evts[0].time);
      } else {
        const clubList = evts.map(e => e.club).join(' & ');
        parts.push(name + ' has ' + clubList);
      }
    });
    let text = parts.join('. ');
    if (totalDue > 0) text += '. 1 fee due.';
    return text;
  }, [todayEvts, totalDue]);

  const firstName = profile?.first_name || 'there';

  return (
    <ErrorBoundary label="Home">
      {/* Alerts - full width above bento */}
      <AlertCallout
        alerts={(alerts || []).filter(a => !a.adminOnly || isAdmin)}
        max={5}
        onAction={(alert) => {
          if (alert.action?.tab) {
            if (alert.action.subaction) onChangeTab(alert.action.tab, alert.action.subaction);
            else onChangeTab(alert.action.tab);
          }
        }}
        onDismiss={(id) => {
          const dismissed = JSON.parse(localStorage.getItem('ocv-dismissed-alerts') || '{}');
          dismissed[id] = Date.now() + 86400000;
          localStorage.setItem('ocv-dismissed-alerts', JSON.stringify(dismissed));
        }}
      />

      <div className="bento-grid">

        {/* 1. Greeting tile */}
        <div className="bento-full" style={{ padding: '8px 0 4px' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 34,
            fontWeight: 400,
            color: 'var(--color-primary)',
            lineHeight: 1.1,
            margin: 0,
          }}>
            {getGreeting()}, {firstName}
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--color-muted)',
            marginTop: 6,
            lineHeight: 1.4,
          }}>
            {summary}
          </p>
        </div>

        {/* 2. Today's Timeline */}
        <div className="bento-full bento-wide" style={{ padding: '4px 0' }}>
          {remainingToday.length > 0 ? (
            <div style={{ position: 'relative', paddingLeft: 56 }}>
              {/* Vertical timeline line */}
              <div style={{
                position: 'absolute',
                left: 44,
                top: 8,
                bottom: 8,
                width: 2,
                background: 'var(--color-border)',
                borderRadius: 1,
              }} />

              {remainingToday.map((evt, i) => {
                const mins = minutesUntil(evt.time);
                const isUpcoming = mins > 0 && mins <= 60;
                const dotColor = getMemberCol(evt.memberId, evt.colour);
                const catIcon = CLUB_ICONS[evt.category] || CLUB_ICONS.other;

                return (
                  <div
                    key={evt.id}
                    className="stagger-card"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '10px 12px 10px 0',
                      marginBottom: i < remainingToday.length - 1 ? 2 : 0,
                      borderRadius: 10,
                      background: isUpcoming ? 'var(--color-primary-bg)' : 'transparent',
                      animationDelay: (i * 40) + 'ms',
                      position: 'relative',
                    }}
                  >
                    {/* Time label */}
                    <div style={{
                      position: 'absolute',
                      left: -52,
                      top: 12,
                      width: 40,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--color-muted)',
                      textAlign: 'right',
                    }}>
                      {evt.time}
                    </div>

                    {/* Dot on timeline */}
                    <div style={{
                      position: 'absolute',
                      left: -16,
                      top: 14,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: dotColor,
                      border: '2px solid var(--color-card)',
                      boxShadow: isUpcoming ? '0 0 0 3px ' + dotColor + '33' : 'none',
                      zIndex: 1,
                    }} />

                    {/* Event details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: 'var(--color-text)',
                        }}>
                          {evt.club || evt.title}
                        </span>
                        {isUpcoming && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--color-accent)',
                            background: 'var(--color-accent-bg)',
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}>
                            in {mins} min
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: 'var(--color-muted)',
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <span>{catIcon.emoji}</span>
                        <span>{evt.member}</span>
                        {evt.endTime && <span style={{ margin: '0 2px' }}>&middot;</span>}
                        {evt.endTime && <span>ends {evt.endTime}</span>}
                      </div>
                      {evt.driver && (
                        <div style={{
                          fontSize: 11,
                          color: 'var(--color-muted)',
                          marginTop: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}>
                          <span style={{ fontSize: 12 }}>&#x1F697;</span>
                          <span>{evt.driver}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '24px 16px',
              color: 'var(--color-muted)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>&#x1F343;</div>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                color: 'var(--color-primary)',
                marginBottom: 4,
              }}>
                Free day
              </div>
              <div style={{ fontSize: 13 }}>
                Nothing left on the calendar today. Enjoy!
              </div>
            </div>
          )}
        </div>

        {/* 3. Stat tiles */}
        <div
          className="bento-half stagger-card card-hover"
          onClick={() => { onChangeTab('week'); window.scrollTo(0, 0); }}
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: 16,
            textAlign: 'center',
            cursor: 'pointer',
            animationDelay: '120ms',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            color: 'var(--color-primary)',
            lineHeight: 1,
          }}>
            <CountUp to={filteredWeekEvts.length} />
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: 'var(--color-muted)',
            fontWeight: 600,
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            activities
          </div>
        </div>

        {isAdmin && (
          <div
            className="bento-half stagger-card card-hover"
            onClick={() => { onChangeTab('money'); window.scrollTo(0, 0); }}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 14,
              padding: 16,
              textAlign: 'center',
              cursor: 'pointer',
              animationDelay: '160ms',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 28,
              color: totalDue > 0 ? 'var(--color-accent)' : 'var(--color-primary)',
              lineHeight: 1,
            }}>
              &euro;<CountUp to={parseFloat(totalDue.toFixed(0))} />
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: 'var(--color-muted)',
              fontWeight: 600,
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              due
            </div>
          </div>
        )}

        {/* 4. Tomorrow Preview */}
        {tomorrowEvts.length > 0 && (
          <div className="bento-full stagger-card" style={{ animationDelay: '200ms' }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--color-primary)',
              marginBottom: 8,
            }}>
              Tomorrow
            </h3>
            <div
              className="hide-scrollbar"
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 2,
              }}
            >
              {tomorrowEvts.map(evt => {
                const dotColor = getMemberCol(evt.memberId, evt.colour);
                return (
                  <div
                    key={evt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--color-surface)',
                      borderRadius: 10,
                      padding: '8px 14px',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: dotColor,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--color-text)',
                    }}>
                      {evt.club || evt.title}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-muted)',
                    }}>
                      {evt.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Family section */}
        <div className="bento-full stagger-card" style={{ animationDelay: '240ms' }}>
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--color-primary)',
            marginBottom: 8,
          }}>
            Family
          </h3>
          <div
            className="hide-scrollbar"
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 2,
            }}
          >
            {kids.map((k, ki) => {
              const col = COLS[ki % COLS.length];
              const kidEvtCount = activeWeekEvts.filter(e => e.memberId === k.id).length;
              const isSelected = filter === k.id;
              return (
                <div
                  key={k.id}
                  onClick={() => onRefresh(isSelected ? 'filter:all' : 'filter:' + k.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--color-card)',
                    border: isSelected ? '2px solid ' + col : '1px solid var(--color-border)',
                    borderRadius: 14,
                    padding: '14px 18px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    minWidth: 80,
                    boxShadow: 'var(--shadow)',
                    transition: 'transform .15s, border-color .15s',
                  }}
                  onTouchStart={ev => ev.currentTarget.style.transform = 'scale(.95)'}
                  onTouchEnd={ev => ev.currentTarget.style.transform = ''}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: col,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                  }}>
                    {(k.first_name || '?')[0]}
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                  }}>
                    {k.first_name}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--color-muted)',
                  }}>
                    {kidEvtCount} activit{kidEvtCount === 1 ? 'y' : 'ies'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </ErrorBoundary>
  );
}
