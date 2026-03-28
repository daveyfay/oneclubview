import React from 'react';

export default function Logo({ dark }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width="32" height="32" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill={dark ? "#fff" : "var(--color-primary)"} />
        <circle cx="50" cy="50" r="30" stroke={dark ? "var(--color-primary)" : "#fff"} strokeWidth="6" fill="none" />
        <circle cx="50" cy="50" r="10" fill={dark ? "var(--color-primary)" : "#fff"} />
      </svg>
      <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 800, color: dark ? "#fff" : "var(--color-primary)", letterSpacing: "-0.5px" }}>
        OneClubView
      </span>
    </div>
  );
}
