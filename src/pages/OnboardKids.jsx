import React, { useState, useEffect, useRef } from 'react';
import { db, SB, SK } from '../lib/supabase';
import { track, showToast, san } from '../lib/utils';
import { CC } from '../lib/constants';
import Logo from '../components/Logo';

function getAge(d) {
  if (!d) return null;
  const t = new Date();
  const b = new Date(d);
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
}

export default function OnboardKids({ userId, onDone, onLogout }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState("");
  const [schoolId, setSchoolId] = useState(null);
  const [schoolQ, setSchoolQ] = useState("");
  const [schoolResults, setSchoolResults] = useState([]);
  const [cls, setCls] = useState("");
  const [kids, setKids] = useState([]);
  const [sv, setSv] = useState(false);
  const schoolTmr = useRef(null);

  function onSchoolType(v) {
    setSchoolQ(v);
    setSchool(v);
    setSchoolId(null);
    clearTimeout(schoolTmr.current);
    if (v.length < 2) {
      setSchoolResults([]);
      return;
    }
    schoolTmr.current = setTimeout(async () => {
      const r = await db("schools", "GET", {
        filters: [
          "or=(name.ilike.*" + san(v) + "*,address.ilike.*" + san(v) + "*)",
          "school_type=eq.primary"
        ],
        limit: 8,
        order: "name.asc"
      });
      setSchoolResults(r || []);
    }, 300);
  }

  function pickSchool(s) {
    setSchoolQ(s.name);
    setSchool(s.name);
    setSchoolId(s.id);
    setSchoolResults([]);
  }

  async function add() {
    if (!name.trim()) return;
    setSv(true);
    const r = await db("dependants", "POST", {
      body: {
        parent_user_id: userId,
        first_name: name.trim(),
        date_of_birth: dob || null,
        school_name: school.trim() || null,
        school_id: schoolId || null,
        school_class: cls || null
      }
    });
    if (r && r[0]) setKids([...kids, { id: r[0].id, name: name.trim(), dob, school: school.trim() }]);
    setName("");
    setDob("");
    setSchool("");
    setSchoolQ("");
    setSchoolId(null);
    setCls("");
    setSv(false);
  }

  return (
    <div className="fi" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--warm)" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
        <h2 style={{ fontFamily: "var(--sr)", fontSize: 24, fontWeight: 800, color: "var(--g)" }}>Who's in your family?</h2>
        <p style={{ fontSize: 14, color: "var(--mt)", marginTop: 6 }}>Add your kids so we can match clubs and camps to them</p>
        {kids.length > 0 && (
          <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
            {kids.map(k => (
              <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gxl)", borderRadius: 14, padding: "10px 16px", border: "1px solid #c8e6c9" }}>
                <span>👧</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--g)" }}>{k.name}</span>
                {k.dob && <span style={{ fontSize: 12, color: "var(--gl)" }}>age {getAge(k.dob)}</span>}
                {k.school && <span style={{ fontSize: 11, color: "var(--mt)", marginLeft: "auto" }}>🏫 {k.school}</span>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16, textAlign: "left" }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Child's first name"
            onKeyDown={e => e.key === "Enter" && add()}
          />
          <input
            type="date"
            value={dob}
            onChange={e => setDob(e.target.value)}
          />
          <div style={{ position: "relative" }}>
            <input
              value={schoolQ}
              onChange={e => onSchoolType(e.target.value)}
              placeholder="School name (optional)"
            />
            {schoolId && <span style={{ position: "absolute", right: 12, top: 13, fontSize: 12, color: "#16a34a" }}>✓</span>}
            {schoolResults.length > 0 && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid var(--bd)",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,.1)",
                zIndex: 20,
                overflow: "hidden",
                marginTop: 4,
                maxHeight: 200,
                overflowY: "auto"
              }}>
                {schoolResults.map(s => (
                  <button
                    key={s.id}
                    onClick={() => pickSchool(s)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "none",
                      borderBottom: "1px solid #f5f3ef",
                      background: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--sn)"
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{s.name}</div>
                    {s.address && <div style={{ fontSize: 11, color: "var(--mt)" }}>{s.address}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={cls}
            onChange={e => setCls(e.target.value)}
            style={{ color: cls ? "var(--tx)" : "var(--mt)" }}>
            <option value="">Class (optional)</option>
            {CC.classes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={add}
            disabled={sv || !name.trim()}
            className="btn bp"
            style={{ opacity: (!name.trim() || sv) ? .4 : 1 }}>
            Add child
          </button>
        </div>
        <button
          onClick={() => {
            if (kids.length) db("profiles", "PATCH", { body: { onboarding_step: "kids_done" }, filters: ["id=eq." + userId] });
            onDone();
          }}
          className={"btn " + (kids.length ? "bp" : "bs")}
          style={{ marginTop: 24 }}>
          {kids.length ? "Next — add clubs →" : "Skip — just me"}
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              marginTop: 16,
              background: "none",
              border: "none",
              fontSize: 12,
              color: "var(--mt)",
              cursor: "pointer",
              fontFamily: "var(--sn)"
            }}>
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
