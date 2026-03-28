import React from 'react';

export default function OcvModal({ open, onClose, title, children, footer, width }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: width || 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 800, color: 'var(--color-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--color-muted)', cursor: 'pointer', padding: '4px' }}>{'\u00D7'}</button>
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 120px)' }}>
          {children}
        </div>
        {footer && <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>{footer}</div>}
      </div>
    </div>
  );
}
