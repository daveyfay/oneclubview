import React from 'react';

export default function OcvModal({ open, onClose, title, children, width }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10,15,20,.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ background: "var(--card)", borderRadius: "24px 24px 0 0", padding: "28px 24px 24px", width: "100%", maxWidth: width || 480, maxHeight: "85vh", overflowY: "auto", boxShadow: "var(--shadow-xl)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "var(--sr)", fontSize: 20, fontWeight: 800, color: "var(--g)" }}>{title}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: "none", background: "var(--warm)", cursor: "pointer", fontSize: 16, color: "var(--mt)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
