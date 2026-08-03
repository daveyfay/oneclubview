import { useEffect, useCallback } from 'react';
import { CLUB_ICONS } from '../lib/constants';
import { showToast } from '../lib/utils';

export default function ActivitySheet({ event, open, onClose, onDelete, onDriverChange, adults, profile, load }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const handleDrive = useCallback(() => {
    if (onDriverChange && profile) {
      onDriverChange(event, profile.first_name);
    }
    showToast("You're driving!");
    onClose();
  }, [event, onDriverChange, profile, onClose]);

  const handleSkip = useCallback(() => {
    if (onDelete) onDelete(event);
    onClose();
  }, [event, onDelete, onClose]);

  if (!open || !event) return null;

  const isManual = event.source_type === 'manual';
  const isPayment = event.source_type === 'payment' || event.isPayment;

  // Don't render for payment events
  if (isPayment) return null;

  const icon = CLUB_ICONS[event.category] || CLUB_ICONS.other || { emoji: '', label: event.category || '' };
  const memberCol = event.colour || '#999';

  // Format time + day
  const whenParts = [];
  if (event.time) {
    whenParts.push(event.time.slice(0, 5));
    if (event.endTime) whenParts[0] += '\u2013' + event.endTime.slice(0, 5);
  }
  if (event.date) {
    const d = event.date instanceof Date ? event.date : new Date(event.date);
    whenParts.push(d.toLocaleDateString('en-IE', { weekday: 'long' }));
  }
  const whenStr = whenParts.join(' \u00B7 ') || '\u2014';

  const driverStr = event.driver || null;
  const skipLabel = isManual ? 'Remove' : 'Skip this week';

  const rows = [
    { label: 'When', value: whenStr, coral: false },
    { label: 'Where', value: event.location || '\u2014', coral: false },
    { label: 'Driving', value: driverStr || 'Nobody yet', coral: !driverStr },
    { label: 'Category', value: icon.emoji ? `${icon.emoji} ${icon.label}` : icon.label, coral: false },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${event.club || event.title || 'Activity'} details`}
      >
        {/* Grab handle */}
        <div style={{
          width: 38,
          height: 4,
          borderRadius: 2,
          background: '#cbd1d6',
          margin: '0 auto 20px',
        }} />

        {/* Member eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: memberCol,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '.12em',
            color: 'var(--color-muted)',
          }}>
            {event.member}
          </span>
        </div>

        {/* Activity name */}
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 29,
          fontWeight: 700,
          color: 'var(--color-primary)',
          lineHeight: 1.15,
          marginBottom: 12,
        }}>
          {event.club || event.title || 'Event'}
        </div>

        {/* Label/value rows */}
        <div>
          {rows.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                padding: '10px 0',
                borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <span style={{
                width: 78,
                flexShrink: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                color: 'var(--color-muted)',
              }}>
                {row.label}
              </span>
              <span style={{
                fontSize: 15,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                color: row.coral ? 'var(--color-accent)' : 'var(--color-text)',
              }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={handleDrive}
            style={{
              flex: 1,
              background: '#1a2a3a',
              color: '#fff',
              borderRadius: 12,
              minHeight: 44,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(26,42,58,.20)',
            }}
          >
            I'm driving
          </button>
          <button
            onClick={handleSkip}
            style={{
              flex: '0 0 auto',
              background: '#f1efec',
              color: '#5a6470',
              borderRadius: 12,
              minHeight: 44,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              border: 'none',
              cursor: 'pointer',
              padding: '0 20px',
            }}
          >
            {skipLabel}
          </button>
        </div>
      </div>
    </>
  );
}
