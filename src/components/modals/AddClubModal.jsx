import React, { useState } from 'react';
import OcvModal from './OcvModal';
import { db } from '../../lib/supabase';
import { showToast } from '../../lib/utils';

export default function AddClubModal({ userId, kids, profile, onClose, onSaved }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [saving, setSaving] = useState(false);

  async function search(q) {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const r = await db("clubs", "GET", {
      filters: ["name.ilike.*" + encodeURIComponent(q) + "*"],
      select: "id,name,address",
      limit: 15,
    });
    setResults(r || []);
    setSearching(false);
  }

  function toggleAssignee(id) {
    setAssignees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function save() {
    if (!selected || assignees.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(assignees.map(depId =>
        db("hub_subscriptions", "POST", {
          body: {
            user_id: userId,
            club_id: selected.id,
            dependant_id: depId === "self" ? null : depId,
          },
        })
      ));
      showToast("Club added!");
      onSaved();
    } catch (e) {
      console.error("AddClubModal save error:", e);
      showToast("Something went wrong.", "err");
    }
    setSaving(false);
  }

  // Step 2: Assign members
  if (selected) {
    const members = [
      ...(kids || []).map(k => ({ id: k.id, name: k.first_name, emoji: "👧" })),
      { id: "self", name: profile?.first_name || "Me", emoji: "👤" },
    ];
    return (
      <OcvModal open={true} onClose={onClose} title={"Add " + selected.name}>
        <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 16 }}>Who goes to this club?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {members.map(m => (
            <button key={m.id} onClick={() => toggleAssignee(m.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                borderRadius: 12, border: assignees.includes(m.id) ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                background: assignees.includes(m.id) ? "var(--color-primary-bg)" : "var(--color-card)",
                cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
                color: "var(--color-text)", width: "100%", textAlign: "left",
              }}
            >
              <span>{m.emoji}</span> {m.name}
              {assignees.includes(m.id) && <span style={{ marginLeft: "auto", color: "var(--color-primary)" }}>✓</span>}
            </button>
          ))}
        </div>
        <button onClick={save} disabled={assignees.length === 0 || saving} className="btn btn-primary">
          {saving ? "Adding..." : "Add club"}
        </button>
        <button onClick={() => { setSelected(null); setAssignees([]); }}
          style={{ width: "100%", marginTop: 8, padding: 10, background: "none", border: "none", fontSize: 13, color: "var(--color-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >← Back to search</button>
      </OcvModal>
    );
  }

  // Step 1: Search clubs
  return (
    <OcvModal open={true} onClose={onClose} title="Add a club">
      <input
        type="text"
        placeholder="Search clubs by name..."
        value={query}
        onChange={e => search(e.target.value)}
        autoFocus
        style={{ marginBottom: 12 }}
      />
      {searching && <p style={{ fontSize: 13, color: "var(--color-muted)", padding: 8 }}>Searching...</p>}
      {!searching && query.length >= 2 && results.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--color-muted)", padding: 8, textAlign: "center" }}>No clubs found for "{query}"</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {results.map(club => (
          <button key={club.id} onClick={() => setSelected(club)}
            style={{
              display: "flex", flexDirection: "column", gap: 2, padding: "12px 14px",
              borderRadius: 12, border: "1.5px solid var(--color-border)",
              background: "var(--color-card)", cursor: "pointer", textAlign: "left",
              fontFamily: "var(--font-sans)", width: "100%",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{club.name}</span>
            {club.address && <span style={{ fontSize: 12, color: "var(--color-muted)" }}>{club.address}</span>}
          </button>
        ))}
      </div>
    </OcvModal>
  );
}
