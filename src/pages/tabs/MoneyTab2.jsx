import React, { useState, useMemo, useCallback } from 'react';
import { useHubData } from '../../hooks/useHubData';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { db } from '../../lib/supabase';
import { showToast } from '../../lib/utils';
import { CC, COLS } from '../../lib/constants';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function MoneyTab2({ filter }) {
  const {
    kids, clubs, pays, profile, isAdmin,
    getMemberCol, loading, load, clubTermMap,
  } = useHubData();

  const isDesktop = useIsDesktop();
  const [segment, setSegment] = useState('due'); // 'due' | 'paid'
  const [markingId, setMarkingId] = useState(null);

  // Filter fees by kid if filter is set
  const filtPays = useMemo(() =>
    filter === 'all' ? pays : pays.filter(p => (p.dependant_id || 'self') === filter),
    [pays, filter]
  );

  const now = new Date();

  // Derive overdue / due / paid lists
  const dueFees = useMemo(() =>
    filtPays.filter(p => !p.paid && p.status !== 'not_renewing'),
    [filtPays]
  );
  const paidFees = useMemo(() =>
    filtPays.filter(p => p.paid),
    [filtPays]
  );
  const overdueFees = useMemo(() =>
    dueFees.filter(p => new Date(p.due_date) < now),
    [dueFees]
  );

  const totalOutstanding = useMemo(() =>
    dueFees.reduce((s, p) => s + parseFloat(p.amount || 0), 0),
    [dueFees]
  );

  const hasOverdue = overdueFees.length > 0;

  // Term progress — find the current term from clubTermMap
  const termProgress = useMemo(() => {
    if (!filtPays.length) return null;
    // Sum paid and total for all fees in this view
    const totalAll = filtPays.filter(p => p.status !== 'not_renewing')
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const totalPaidAmt = paidFees.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    if (totalAll === 0) return null;

    // Try to find a term name from clubTermMap
    let termName = null;
    if (clubTermMap) {
      const termEntries = Object.values(clubTermMap);
      if (termEntries.length > 0) {
        // Find the current or most recent term
        const nowMs = Date.now();
        const current = termEntries.find(t => new Date(t.start_date) <= nowMs && new Date(t.end_date) >= nowMs);
        termName = current?.term_name || termEntries[termEntries.length - 1]?.term_name || null;
      }
    }

    return { termName, paid: totalPaidAmt, total: totalAll, pct: Math.min(100, (totalPaidAmt / totalAll) * 100) };
  }, [filtPays, paidFees, clubTermMap]);

  // Sub-line for balance card
  const subLine = useMemo(() => {
    if (dueFees.length === 0) return 'All paid up';
    if (hasOverdue) {
      const rest = dueFees.length - overdueFees.length;
      if (rest > 0) return `${overdueFees.length} overdue \u00B7 ${rest} more due`;
      return `${overdueFees.length} overdue`;
    }
    return `${dueFees.length} payment${dueFees.length !== 1 ? 's' : ''} due`;
  }, [dueFees, overdueFees, hasOverdue]);

  // Mark paid handler
  const handleMarkPaid = useCallback(async (feeId) => {
    setMarkingId(feeId);
    try {
      await db('payment_reminders', 'PATCH', {
        filters: ['id=eq.' + feeId],
        body: { paid: true, paid_at: new Date().toISOString() },
      });
      await load();
      showToast('Marked as paid!');
    } catch (e) {
      showToast('Failed to update. Try again.', 'err');
    } finally {
      setMarkingId(null);
    }
  }, [load]);

  // Format date helpers
  function fmtDueDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function fmtPaidDate(dateStr) {
    if (!dateStr) return 'Paid';
    const d = new Date(dateStr);
    return 'Paid ' + d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
  }

  const activeFees = segment === 'due' ? dueFees : paidFees;

  // Loading skeleton
  if (loading) return (
    <ErrorBoundary label="Money">
      <div style={{ padding: '4px 0' }}>
        <div className="skeleton-shimmer" style={{ height: 14, width: '40%', borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ height: 32, width: '30%', borderRadius: 8, marginBottom: 16 }} />
        <div className="skeleton-shimmer" style={{ height: 160, borderRadius: 26, marginBottom: 16 }} />
        <div className="skeleton-shimmer" style={{ height: 44, borderRadius: 14, marginBottom: 16 }} />
        {[0, 1, 2].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 100, borderRadius: 18, marginBottom: 10 }} />)}
      </div>
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary label="Money">
      <div>
        {/* Eyebrow */}
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '.16em',
          color: 'var(--color-muted)',
          marginBottom: 4,
        }}>
          Fees & Payments
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 38,
          fontWeight: 700,
          color: 'var(--color-primary)',
          letterSpacing: '-.02em',
          margin: '0 0 16px',
          lineHeight: 1.1,
        }}>
          Money
        </h2>

        {/* Balance card — hidden on desktop (shown in ContextRail) */}
        {!isDesktop && (
          <div style={{
            background: '#fff',
            borderRadius: 26,
            padding: '24px 22px',
            border: '1px solid var(--color-border)',
            marginBottom: 16,
          }}>
            {/* Outstanding eyebrow */}
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '.16em',
              color: 'var(--color-muted)',
              marginBottom: 6,
            }}>
              Outstanding
            </div>

            {/* Total amount */}
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 46,
              fontWeight: 700,
              color: hasOverdue ? '#e85d4a' : 'var(--color-primary)',
              lineHeight: 1.1,
              marginBottom: 4,
            }}>
              {CC.currency}{totalOutstanding.toFixed(0)}
            </div>

            {/* Sub-line */}
            <div style={{
              fontSize: 14,
              color: 'var(--color-muted)',
              marginBottom: 16,
            }}>
              {subLine}
            </div>

            {/* Hairline divider */}
            <div style={{
              height: 1,
              background: 'var(--color-border)',
              marginBottom: 14,
            }} />

            {/* Term row */}
            {termProgress && (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)' }}>
                    {termProgress.termName || 'This term'}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>
                    {CC.currency}{termProgress.paid.toFixed(0)} paid of {CC.currency}{termProgress.total.toFixed(0)}
                  </span>
                </div>

                {/* Progress bar */}
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
                    width: termProgress.pct + '%',
                    transition: 'width .4s ease',
                  }} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Segmented control */}
        <div style={{
          display: 'flex',
          background: '#ece9e4',
          borderRadius: 14,
          padding: 4,
          marginBottom: 16,
        }}>
          {['due', 'paid'].map(seg => {
            const count = seg === 'due' ? dueFees.length : paidFees.length;
            const active = segment === seg;
            return (
              <button
                key={seg}
                onClick={() => setSegment(seg)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13.5,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--color-primary)' : '#7c8590',
                  background: active ? '#fff' : 'transparent',
                  boxShadow: active ? '0 2px 6px rgba(26,42,58,.10)' : 'none',
                  transition: 'all .2s ease',
                }}
              >
                {seg === 'due' ? 'Due' : 'Paid'} &middot; {count}
              </button>
            );
          })}
        </div>

        {/* Fee cards */}
        {activeFees.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            color: 'var(--color-muted)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>
              {segment === 'due' ? '\u2705' : '\u{1F4B3}'}
            </div>
            <p style={{ fontSize: 14 }}>
              {segment === 'due' ? 'Nothing due right now' : 'No payments recorded yet'}
            </p>
          </div>
        ) : (
          <div style={isDesktop ? {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          } : undefined}>
            {activeFees.map(fee => {
              const kid = fee.dependant_id ? kids.find(k => k.id === fee.dependant_id) : null;
              const kidName = kid?.first_name || profile?.first_name || 'You';
              const isOverdue = !fee.paid && new Date(fee.due_date) < now;
              const dotColor = kid
                ? getMemberCol(fee.dependant_id)
                : COLS[0];

              // Amount color
              let amountColor = 'var(--color-text)';
              if (isOverdue) amountColor = '#E63946';
              else if (fee.paid) amountColor = '#2d4a5f';

              // Chip config
              let chipBg, chipColor, chipText;
              if (fee.paid) {
                chipBg = 'var(--color-primary-bg)';
                chipColor = 'var(--color-primary)';
                chipText = fmtPaidDate(fee.paid_at);
              } else if (isOverdue) {
                chipBg = '#FEF0F0';
                chipColor = '#E63946';
                const overdueDate = new Date(fee.due_date);
                chipText = 'Overdue since ' + overdueDate.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
              } else {
                chipBg = '#f1efec';
                chipColor = '#6b7480';
                chipText = 'Due ' + fmtDueDate(fee.due_date);
              }

              return (
                <div
                  key={fee.id}
                  style={{
                    background: '#fff',
                    borderRadius: 18,
                    padding: isDesktop ? '20px' : '16px 17px',
                    border: '1px solid var(--color-border)',
                    marginBottom: isDesktop ? 0 : 10,
                  }}
                >
                  {/* Top row: title + amount */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 6,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title */}
                      <div style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        marginBottom: 4,
                      }}>
                        {fee.description}
                      </div>
                      {/* Member dot + name */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}>
                        <span style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: dotColor,
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: 13,
                          color: 'var(--color-muted)',
                        }}>
                          {kidName}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 26,
                      fontWeight: 700,
                      color: amountColor,
                      flexShrink: 0,
                      marginLeft: 12,
                    }}>
                      {CC.currency}{parseFloat(fee.amount).toFixed(0)}
                    </div>
                  </div>

                  {/* Footer row: chip + mark paid button */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 10,
                  }}>
                    {/* Chip */}
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 9px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      background: chipBg,
                      color: chipColor,
                    }}>
                      {chipText}
                    </span>

                    {/* Mark paid button — only on Due segment */}
                    {segment === 'due' && (
                      <button
                        onClick={() => handleMarkPaid(fee.id)}
                        disabled={markingId === fee.id}
                        style={{
                          background: 'var(--color-primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 11,
                          padding: '8px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                          cursor: markingId === fee.id ? 'wait' : 'pointer',
                          minHeight: 36,
                          opacity: markingId === fee.id ? 0.6 : 1,
                          transition: 'opacity .15s',
                        }}
                      >
                        {markingId === fee.id ? 'Saving\u2026' : 'Mark paid'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
