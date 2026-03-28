import React, { useState, useEffect } from 'react';

export default function OcvInput({ open, onClose, onSubmit, title, placeholder, defaultValue, inputType }) {
  const [val, setVal] = useState(defaultValue || "");
  useEffect(() => { if (open) setVal(defaultValue || ""); }, [open]);
  if (!open) return null;
  return (
    <div className="modal-backdrop modal-overlay" onClick={onClose} style={{ alignItems: "flex-start", paddingTop: "20vh" }}>
      <div className="modal-box modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, margin: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 800, color: "var(--color-primary)" }}>{title || "Enter value"}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: "none", background: "var(--color-warm)", cursor: "pointer", fontSize: 16, color: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <input autoFocus type={inputType || "text"} value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder || ""} onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onSubmit(val.trim()); onClose(); } }} style={{ marginBottom: 16 }} />
        <button onClick={() => { if (val.trim()) { onSubmit(val.trim()); onClose(); } }} className="btn btn-primary" disabled={!val.trim()}>Continue</button>
      </div>
    </div>
  );
}
