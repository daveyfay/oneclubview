import React from 'react';

export default function OcvConfirm({ open, onClose, onConfirm, title, message, confirmText, confirmColor }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10,15,20,.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ background: "var(--card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, boxShadow: "var(--shadow-xl)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "var(--sr)", fontSize: 20, fontWeight: 800, color: "var(--g)" }}>{title || "Confirm"}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: "none", background: "var(--warm)", cursor: "pointer", fontSize: 16, color: "var(--mt)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <p style={{ fontSize: 15, color: "var(--tx)", lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} className="btn bs" style={{ flex: 1 }}>Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="btn" style={{ flex: 1, background: confirmColor || "var(--g)", color: "#fff" }}>{confirmText || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}
