import React, { useEffect } from 'react';

export default function OcvModal({ open, onClose, title, children, footer, width }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="modal-backdrop modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="modal-box modal-sheet"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: width || 480 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 800, color: 'var(--color-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--color-muted)', cursor: 'pointer', padding: '8px', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >{'\u00D7'}</button>
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 120px)' }}>
          {children}
        </div>
        {footer && <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>{footer}</div>}
      </div>
    </div>
  );
}
