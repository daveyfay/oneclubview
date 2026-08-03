import React from 'react';
import { COLS } from '../lib/constants';
import ICN from '../lib/icons';
import Logo from './Logo';

const overviewIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const familyIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;

const NAV_ITEMS = [
  { id: "overview", label: "Today", icon: overviewIcon },
  { id: "week", label: "Week", icon: ICN.calendar },
  { id: "explore", label: "Explore", icon: ICN.search },
  { id: "money", label: "Money", icon: ICN.wallet },
  { id: "family", label: "Family", icon: familyIcon },
];

export default function NavRail({
  tab, onChangeTab, filter, setFilter,
  kids, members, isAdmin, profile, familyMembers, onShowFab,
}) {
  const visibleNavItems = isAdmin ? NAV_ITEMS : NAV_ITEMS.filter(n => n.id !== "money");

  // Find partner name for "Shared with X"
  const partner = familyMembers?.find(
    fm => fm.id !== profile?.id && fm.family_role !== "viewer"
  );
  const partnerName = partner?.first_name || null;

  return (
    <aside className="nav-rail">
      {/* 1. Logo lockup */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <svg width="28" height="28" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="var(--color-primary)" />
          <circle cx="50" cy="50" r="30" stroke="#fff" strokeWidth="6" fill="none" />
          <circle cx="50" cy="50" r="10" fill="#fff" />
        </svg>
        <span style={{
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--color-primary)",
          letterSpacing: "-0.3px",
        }}>
          OneClubView
        </span>
      </div>

      {/* 2. Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 26 }}>
        {visibleNavItems.map(n => {
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onChangeTab(n.id)}
              aria-current={active ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                borderRadius: 12,
                border: "none",
                background: active ? "var(--color-primary)" : "transparent",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 14.5,
                fontWeight: 600,
                color: active ? "#fff" : "var(--color-text)",
                width: "100%",
                textAlign: "left",
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--color-warm)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              {/* 6px dot */}
              <span style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: active ? "#e85d4a" : "#cbd1d6",
                flexShrink: 0,
              }} />
              {n.label}
            </button>
          );
        })}
      </nav>

      {/* 3. SHOWING — kid filter */}
      <div style={{ marginTop: 26 }}>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: ".16em",
          color: "var(--color-muted)",
          marginBottom: 10,
        }}>
          Showing
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Everyone option */}
          <button
            onClick={() => setFilter("all")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 10,
              border: "none",
              background: filter === "all" ? "var(--color-primary-bg)" : "transparent",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 13.5,
              fontWeight: 600,
              color: filter === "all" ? "var(--color-primary)" : "var(--color-text)",
              width: "100%",
              textAlign: "left",
              transition: "background .15s",
            }}
          >
            <span style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--color-primary)",
              flexShrink: 0,
            }} />
            Everyone
          </button>
          {/* Kid names */}
          {kids.map((k, i) => {
            const active = filter === k.id;
            return (
              <button
                key={k.id}
                onClick={() => setFilter(active ? "all" : k.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: active ? "var(--color-primary-bg)" : "transparent",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: active ? "var(--color-primary)" : "var(--color-text)",
                  width: "100%",
                  textAlign: "left",
                  transition: "background .15s",
                }}
              >
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: COLS[i % COLS.length],
                  flexShrink: 0,
                }} />
                {k.first_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* 4. Bottom pinned section */}
      {/* Add an activity button */}
      <button
        onClick={onShowFab}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          padding: "12px 0",
          borderRadius: 12,
          minHeight: 44,
          background: "var(--color-primary)",
          color: "#fff",
          border: "none",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          boxShadow: "0 4px 12px rgba(26,42,58,.20)",
          marginBottom: 14,
        }}
      >
        + Add an activity
      </button>

      {/* Current user row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 4px 8px",
        borderTop: "1px solid var(--color-border)",
        marginTop: 8,
      }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "var(--font-serif)",
          flexShrink: 0,
        }}>
          {(profile?.first_name || "U")[0]}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--color-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {profile?.first_name || "You"}
          </div>
          {partnerName && (
            <div style={{
              fontSize: 11.5,
              color: "var(--color-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              Shared with {partnerName}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
