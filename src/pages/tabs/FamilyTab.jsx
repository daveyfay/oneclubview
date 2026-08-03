import React from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import { COLS } from '../../lib/constants';

export default function FamilyTab() {
  const { kids, profile, familyMembers } = useHubData();
  return (
    <ErrorBoundary label="Family">
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".16em", color: "var(--color-muted)", marginBottom: 8 }}>Household</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 38, fontWeight: 700, color: "var(--color-primary)", letterSpacing: "-.02em", lineHeight: 1.1, marginBottom: 8 }}>Family</h1>
        <p style={{ fontSize: 15, color: "var(--color-muted)", marginBottom: 24 }}>{kids.length} kids {'\u00B7'} {familyMembers.length} members</p>
        {kids.map((k, i) => (
          <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 17px", background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 18, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: COLS[i % COLS.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "var(--font-serif)" }}>{k.first_name?.[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>{k.first_name}</div>
              <div style={{ fontSize: 13, color: "var(--color-muted)" }}>{k.school_name || ""}</div>
            </div>
            <span style={{ color: "#cbd1d6", fontSize: 18 }}>{'\u203A'}</span>
          </div>
        ))}
      </div>
    </ErrorBoundary>
  );
}
