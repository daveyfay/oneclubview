import React, { useState, useRef } from 'react';

const CC = {
  classes: [
    "Junior Infants",
    "Senior Infants",
    "1st Class",
    "2nd Class",
    "3rd Class",
    "4th Class",
    "5th Class",
    "6th Class",
  ],
};

function SchoolPicker({ school, setSchool, schoolId, setSchoolId, cls, setCls }) {
  const [q, setQ] = useState(school || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const tmr = useRef(null);

  function onType(v) {
    setQ(v);
    if (schoolId) {
      setSchoolId(null);
      setSchool("");
    }
    clearTimeout(tmr.current);
    if (v.length < 2) {
      setResults([]);
      return;
    }
    tmr.current = setTimeout(async () => {
      setSearching(true);
      const r = await db("schools", "GET", {
        filters: [
          "or=(name.ilike.*" +
            encodeURIComponent(v) +
            "*,address.ilike.*" +
            encodeURIComponent(v) +
            "*)",
        ],
        limit: 15,
        order: "name.asc",
      });
      // Sort by distance if user has location
      let sorted = r || [];
      setResults(sorted);
      setSearching(false);
    }, 300);
  }

  function pick(s) {
    setQ(s.name);
    setSchool(s.name);
    setSchoolId(s.id);
    setResults([]);
  }

  const classes = CC.classes;

  return (
    <div
      style={{
        background: "#f8f7f4",
        borderRadius: 14,
        padding: 14,
        border: "1px solid var(--color-border)",
      }}
    >
      <span
        className="label"
        style={{ marginBottom: 8 }}
      >
        School (helps match classmates at camps)
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <input
            value={q}
            onChange={(e) => onType(e.target.value)}
            placeholder="Start typing school name..."
          />
          {searching && (
            <span
              style={{
                position: "absolute",
                right: 12,
                top: 13,
                fontSize: 12,
                color: "var(--color-muted)",
              }}
            >
              ...
            </span>
          )}
          {schoolId && (
            <span
              style={{
                position: "absolute",
                right: 12,
                top: 13,
                fontSize: 12,
                color: "#16a34a",
              }}
            >
              ✓
            </span>
          )}
          {!schoolId && q.length > 2 && !searching && (
            <span
              style={{
                position: "absolute",
                right: 12,
                top: 13,
                fontSize: 10,
                color: "var(--color-accent)",
              }}
            >
              Pick from list
            </span>
          )}
          {results.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,.1)",
                zIndex: 20,
                overflow: "hidden",
                marginTop: 4,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pick(s)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: "1px solid #f5f3ef",
                    background: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-text)",
                    }}
                  >
                    {s.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                    {s.address || s.county || ""}
                    {s.school_type === "secondary" ? " · Secondary" : ""}
                  </div>
                </button>
              ))}
              {results.length === 0 && q.length > 2 && !searching && (
                <div
                  style={{
                    padding: 12,
                    fontSize: 12,
                    color: "var(--color-muted)",
                    textAlign: "center",
                  }}
                >
                  No schools found. Try a different spelling.
                </div>
              )}
            </div>
          )}
        </div>
        {schoolId && (
          <div>
            <span className="label">Class</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {classes.map((cl) => (
                <button
                  key={cl}
                  type="button"
                  onClick={() => setCls(cls === cl ? "" : cl)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 8,
                    border:
                      cls === cl
                        ? "1.5px solid var(--color-primary)"
                        : "1.5px solid var(--color-border)",
                    background: cls === cl ? "var(--color-primary-bg)" : "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    color: cls === cl ? "var(--color-primary)" : "var(--color-muted)",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {cl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SchoolPicker;
