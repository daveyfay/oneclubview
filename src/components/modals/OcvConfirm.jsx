import React from 'react';

export default function OcvConfirm({ open, onClose, onConfirm, title, message, confirmText, confirmColor }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop modal-overlay" onClick={onClose} style={{ alignItems: "center", padding: 16 }}>
      <div className="modal-box modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 800, color: "var(--color-primary)" }}>{title || "Confirm"}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: "none", background: "var(--color-warm)", cursor: "pointer", fontSize: 16, color: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <p style={{ fontSize: 15, color: "var(--color-text)", lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="btn" style={{ flex: 1, background: confirmColor || "var(--color-primary)", color: "#fff" }}>{confirmText || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}
