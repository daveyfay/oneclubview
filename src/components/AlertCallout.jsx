import React from 'react';

const SEVERITY = {
  info: { bg: 'var(--color-primary-bg)', border: '#2d7cb5', icon: '\u2139\uFE0F' },
  warn: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning)', icon: '\u26A0\uFE0F' },
  urgent: { bg: 'var(--color-danger-bg)', border: 'var(--color-danger)', icon: '\u{1F6A8}' },
};

export default function AlertCallout({ alerts, onAction, onDismiss, max }) {
  const shown = max ? alerts.slice(0, max) : alerts;
  if (shown.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      {shown.map(alert => {
        const s = SEVERITY[alert.severity] || SEVERITY.info;
        return (
          <div
            key={alert.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 12,
              background: s.bg, borderLeft: '4px solid ' + s.border,
              fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{alert.text}</div>
              {alert.action && (
                <button
                  onClick={() => onAction && onAction(alert)}
                  style={{
                    marginTop: 6, padding: '4px 12px', borderRadius: 8,
                    border: '1px solid ' + s.border, background: 'transparent',
                    fontSize: 12, fontWeight: 600, color: s.border,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}
                >
                  {alert.action.label || 'View'}
                </button>
              )}
            </div>
            {alert.dismissible && onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                aria-label="Dismiss"
                style={{
                  background: 'none', border: 'none', fontSize: 16,
                  color: 'var(--color-muted)', cursor: 'pointer',
                  padding: 4, minWidth: 32, minHeight: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{'\u00D7'}</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
