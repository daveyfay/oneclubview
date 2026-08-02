import React from 'react';

const SECTIONS = [
  { id: 'clubs', label: 'My Clubs', icon: '\u{1F3E0}' },
  { id: 'camps', label: 'Camps', icon: '\u26FA' },
  { id: 'discover', label: 'Discover', icon: '\u{1F50D}' },
];

export default function ExploreSidebar({ activeSection, onSectionChange, locations, activeLocation, onLocationChange }) {
  return (
    <div className="explore-sidebar">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Sections</div>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => onSectionChange(s.id)}
            aria-current={activeSection === s.id ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', borderRadius: 10, border: 'none',
              background: activeSection === s.id ? 'var(--color-primary)' : 'transparent',
              color: activeSection === s.id ? '#fff' : 'var(--color-text)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-sans)', textAlign: 'left', marginBottom: 4,
              transition: 'background .15s, color .15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {locations.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Location</div>
          <button
            onClick={() => onLocationChange('all')}
            style={{
              display: 'block', width: '100%', padding: '8px 12px', borderRadius: 8,
              border: activeLocation === 'all' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: activeLocation === 'all' ? 'var(--color-primary-bg)' : 'var(--color-card)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              color: activeLocation === 'all' ? 'var(--color-primary)' : 'var(--color-text)',
              fontFamily: 'var(--font-sans)', textAlign: 'left', marginBottom: 4,
            }}
          >All locations</button>
          {locations.map(loc => (
            <button
              key={loc.label}
              onClick={() => onLocationChange(loc.label)}
              style={{
                display: 'block', width: '100%', padding: '8px 12px', borderRadius: 8,
                border: activeLocation === loc.label ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: activeLocation === loc.label ? 'var(--color-primary-bg)' : 'var(--color-card)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                color: activeLocation === loc.label ? 'var(--color-primary)' : 'var(--color-text)',
                fontFamily: 'var(--font-sans)', textAlign: 'left', marginBottom: 4,
              }}
            >
              {loc.label}
              <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 400, marginTop: 2 }}>
                {loc.radius}km radius
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
