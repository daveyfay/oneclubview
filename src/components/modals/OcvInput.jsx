import React, { useState, useEffect } from 'react';

export default function OcvInput({ open, onClose, onSubmit, title, placeholder, defaultValue, inputType }) {
  const [val, setVal] = useState(defaultValue || "");
  useEffect(() => { if (open) setVal(defaultValue || ""); }, [open]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10,15,20,.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "20vh" }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ background: "var(--card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, margin: "0 16px", boxShadow: "var(--shadow-xl)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "var(--sr)", fontSize: 20, fontWeight: 800, color: "var(--g)" }}>{title || "Enter value"}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: "none", background: "var(--warm)", cursor: "pointer", fontSize: 16, color: "var(--mt)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <input autoFocus type={inputType || "text"} value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder || ""} onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onSubmit(val.trim()); onClose(); } }} style={{ marginBottom: 16 }} />
        <button onClick={() => { if (val.trim()) { onSubmit(val.trim()); onClose(); } }} className="btn bp" disabled={!val.trim()}>Continue</button>
      </div>
    </div>
  );
}
