import React, { useState, useMemo } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import CampCard from '../../components/hub/CampCard';
import NearbyClubsSection from '../../components/hub/NearbyClubsSection';
import ThingsToDoSection from '../../components/hub/ThingsToDoSection';
import EditClubModal from '../../components/modals/EditClubModal';
import EditHolidayModal from '../../components/modals/EditHolidayModal';
import AddHolidayModal from '../../components/modals/AddHolidayModal';
import { OcvModal, OcvInput } from '../../components/modals';
import { COLS } from '../../lib/constants';
import { CT } from '../../lib/constants';
import { showToast, getAge, calcKm, fmtDate } from '../../lib/utils';
import { db } from '../../lib/supabase';

export default function ExploreTab({ filter, onRefresh }) {
  const {
    kids, clubs, camps, campBookings, holidays, userHolidays,
    schoolLocs, familyLocs, isAdmin,
    clubTermMap, kidMap, user, profile, load, loading, userLoc,
    setFamilyLocs,
  } = useHubData();

  const [exploreTab, setExploreTab] = useState("clubs");
  const [editClub, setEditClub] = useState(null);
  const [editHol, setEditHol] = useState(null);
  const [showAddHol, setShowAddHol] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [showSaveLocModal, setShowSaveLocModal] = useState(false);
  const [showAddLocModal, setShowAddLocModal] = useState(false);
  const [campLoc, setCampLoc] = useState("all");

  // Build all active location points
  const allLocs = useMemo(() => {
    const locs = [];
    if (userLoc) locs.push({ ...userLoc, radius: 15, label: "\u{1F4CD} Current" });
    familyLocs.forEach(fl => locs.push({ lat: Number(fl.latitude), lng: Number(fl.longitude), radius: fl.radius_km || 15, label: fl.label }));
    if (familyLocs.length === 0) schoolLocs.forEach(s => locs.push({ ...s, radius: 10, label: "\u{1F3EB} " + s.name }));
    return locs;
  }, [userLoc, familyLocs, schoolLocs]);

  const filtCamps = useMemo(() => {
    let fc = camps;
    const locsToUse = campLoc === "all" ? allLocs : allLocs.filter(l => l.label === campLoc);
    if (locsToUse.length > 0) {
      fc = fc.filter(c => {
        if (!c.latitude) return false;
        const cLat = Number(c.latitude), cLng = Number(c.longitude);
        return locsToUse.some(loc => calcKm(loc.lat, loc.lng, cLat, cLng) <= loc.radius);
      });
    }
    if (filter === "all" || filter === "self") return fc;
    const kid = kids.find(k => k.id === filter);
    if (!kid || !kid.date_of_birth) return fc;
    const age = getAge(kid.date_of_birth);
    return fc.filter(c => age >= c.age_min && age <= c.age_max);
  }, [camps, filter, kids, allLocs, campLoc]);

  if (loading) return (
    <ErrorBoundary label="Explore">
      <div style={{ padding: '4px 0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[0,1,2].map(i => <div key={i} className="skeleton-shimmer" style={{ width: 80, height: 36, borderRadius: 100 }} />)}
        </div>
        {[0,1,2].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 100, borderRadius: 16, marginBottom: 10 }} />)}
      </div>
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary label="Explore">
      <div>
        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid var(--color-border)" }}>
          {["clubs", "camps", "discover"].map(st => <button key={st} onClick={() => setExploreTab(st)} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: exploreTab === st ? "var(--color-primary)" : "var(--color-muted)", border: "none", background: "none", cursor: "pointer", fontFamily: "var(--font-sans)", borderBottom: exploreTab === st ? "2px solid var(--color-accent)" : "2px solid transparent", textTransform: "capitalize" }}>{st === "clubs" ? "My Clubs" : st === "camps" ? "Camps" : "Discover"}</button>)}
        </div>

        {/* My Clubs sub-tab */}
        {exploreTab === "clubs" && <div>
          {(() => {
            const grouped = {};
            clubs.forEach((c, i) => {
              if (!grouped[c.club_id]) grouped[c.club_id] = { ...c, members: [], idx: i, nickname: c.nickname || null };
              const kid = c.dependant_id ? kids.find(k => k.id === c.dependant_id) : null;
              grouped[c.club_id].members.push(kid ? kid.first_name : (profile?.first_name || "You"));
            });
            return Object.values(grouped).map((c, i) =>
              <div key={c.club_id} onClick={() => setEditClub(c)} style={{ background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", boxShadow: "var(--shadow)", padding: 16, marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: c.colour || COLS[i % COLS.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{c.club_name.split(" ").map(w => w[0]).join("").substring(0, 2)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.club_name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{(c.nickname ? c.nickname + " \u2014 " : "") + c.members.join(", ")}{c.club_addr ? " \u2022 " + c.club_addr : ""}</div>
                </div>
              </div>
            );
          })()}
          {isAdmin && <button onClick={() => onRefresh("clubs")} style={{ width: "100%", padding: 14, borderRadius: 14, border: "2px dashed var(--color-border)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-muted)", fontFamily: "var(--font-sans)", marginTop: 8 }}>+ Add a club</button>}
          <NearbyClubsSection userLoc={userLoc} familyLocs={familyLocs} clubs={clubs} setEditClub={setEditClub} isAdmin={isAdmin} />
        </div>}

        {/* Camps sub-tab */}
        {exploreTab === "camps" && <div>
          {allLocs.length > 1 && <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 10, WebkitOverflowScrolling: "touch" }}>
            <button onClick={() => setCampLoc("all")} className={"pill " + (campLoc === "all" ? "pill-active" : "pill-inactive")} style={{ flexShrink: 0 }}>All locations</button>
            {allLocs.map(l => <button key={l.label} onClick={() => setCampLoc(campLoc === l.label ? "all" : l.label)} className={"pill " + (campLoc === l.label ? "pill-active" : "pill-inactive")} style={{ flexShrink: 0 }}>{l.label}</button>)}
          </div>}
          {allLocs.length <= 1 && allLocs.length > 0 && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-muted)" }}>
              <span>{"\u{1F4CD}"}</span> {allLocs[0]?.label?.replace(/^[^\w]*\s*/, '') || "Near you"}
            </div>
            <button onClick={() => setShowLocations(true)} style={{ fontSize: 11, fontWeight: 600, color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>Manage</button>
          </div>}
          {allLocs.length === 0 && <button onClick={() => setShowLocations(true)} style={{ width: "100%", padding: "10px 14px", marginBottom: 12, borderRadius: 12, border: "2px dashed var(--color-border)", background: "var(--color-card)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-primary-light)", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 8 }}>{"\u{1F4CD}"} Add your locations to see nearby camps</button>}
          {kids.length > 0 && (() => {
            const now = new Date();
            const futureHols = (holidays || []).filter(h => new Date(h.end_date) >= now).slice(0, 1);
            if (futureHols.length === 0) return null;
            return <div style={{ background: "var(--color-card)", borderRadius: 16, border: "1px solid var(--color-border)", padding: 14, marginBottom: 14, boxShadow: "var(--shadow)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-primary)", marginBottom: 8 }}>Holiday coverage</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {futureHols.map(h => {
                  const booked = (campBookings || []).filter(b => {
                    const camp = (camps || []).find(ca => ca.id === b.camp_id);
                    return camp && new Date(camp.start_date) >= new Date(h.start_date) && new Date(camp.start_date) <= new Date(h.end_date);
                  });
                  const covered = booked.length > 0;
                  return <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{h.name}</span>
                    <span style={{ fontWeight: 700, color: covered ? "#16a34a" : "var(--color-accent)", background: covered ? "#f0fdf4" : "var(--color-accent-bg)", padding: "2px 10px", borderRadius: 8 }}>
                      {covered ? booked.length + " booked" : "Not covered"}
                    </span>
                  </div>;
                })}
              </div>
            </div>;
          })()}
          {(() => {
            const now = new Date();
            const mergedHols = holidays.map(h => {
              const override = userHolidays.find(uh => uh.base_holiday_id === h.id);
              if (override) {
                if (override.holiday_type === "hidden") return null;
                return { ...override, is_user_override: true, holiday_type: override.holiday_type || h.holiday_type };
              }
              return { ...h, is_user_override: false };
            }).filter(Boolean);
            userHolidays.filter(uh => !uh.base_holiday_id && uh.holiday_type !== "hidden").forEach(uh => {
              mergedHols.push({ ...uh, is_user_override: true });
            });
            const futureHols = mergedHols.filter(h => new Date(h.end_date + "T23:59:59") >= now).sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).slice(0, 2);
            const kidName = filter !== "all" && filter !== "self" ? kids.find(k => k.id === filter)?.first_name : null;
            const kidAge = filter !== "all" && filter !== "self" ? getAge(kids.find(k => k.id === filter)?.date_of_birth) : null;

            if (futureHols.length === 0) return <p style={{ color: "var(--color-muted)", padding: 20, textAlign: "center" }}>No upcoming school holidays found</p>;

            return futureHols.map(hol => {
              const hs = new Date(hol.start_date + "T00:00:00"), he = new Date(hol.end_date + "T23:59:59");
              const holCamps = filtCamps.filter(camp => {
                const cs = new Date(camp.start_date + "T00:00:00");
                return cs >= hs && cs <= he;
              }).sort((a, b) => {
                const distTo = (c) => {
                  if (!c.latitude) return 999;
                  const cLat = Number(c.latitude), cLng = Number(c.longitude);
                  let min = 999;
                  allLocs.forEach(loc => { min = Math.min(min, calcKm(loc.lat, loc.lng, cLat, cLng)) });
                  return min;
                };
                return distTo(a) - distTo(b);
              });
              const holEmoji = hol.holiday_type === "easter" ? "\u{1F423}" : hol.holiday_type === "summer" ? "\u2600\uFE0F" : hol.holiday_type === "christmas" ? "\u{1F384}" : "\u{1F342}";
              const weeks = Math.max(1, Math.ceil((he - hs) / (7 * 86400000)));

              return <div key={hol.id} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>{holEmoji}</span>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 700, color: "var(--color-primary)", flex: 1 }}>{hol.name}</h3>
                  <button onClick={(e) => { e.stopPropagation(); setEditHol(hol) }} style={{ background: "var(--color-primary-bg)", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "var(--color-primary-light)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>{"\u270E"} Edit dates</button>
                </div>
                <p style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 12 }}>
                  {new Date(hol.start_date).toLocaleDateString("en-IE", { day: "numeric", month: "short" })} {"\u2013"} {new Date(hol.end_date).toLocaleDateString("en-IE", { day: "numeric", month: "short" })} ({weeks} week{weeks > 1 ? "s" : ""}){hol.is_user_override ? " \u2022 customised" : ""}
                  {kidName && kidAge != null ? " \u00B7 Showing camps for " + kidName + " (age " + kidAge + ")" : ""}
                  {" \u00B7 " + holCamps.length + " camp" + (holCamps.length !== 1 ? "s" : "") + " found"}
                </p>

                {holCamps.length === 0 ?
                  <div style={{ padding: 20, borderRadius: 14, border: "2px dashed var(--color-border)", textAlign: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{"\u{1F50D}"}</div>
                    <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No camps listed yet for this break</p>
                    <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>We'll alert you when camps appear</p>
                  </div>
                : holCamps.map(camp => <CampCard key={camp.id} camp={camp} userLoc={userLoc} allLocs={allLocs} user={user} kids={kids} filter={filter} campBookings={campBookings} CT={CT} fmtDate={fmtDate} onBookingChange={load} isAdmin={isAdmin} />)}
              </div>
            });
          })()}
          <button onClick={() => setShowAddHol(true)} style={{ width: "100%", padding: 14, borderRadius: 14, border: "2px dashed var(--color-border)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-muted)", fontFamily: "var(--font-sans)", marginTop: 8 }}>+ Add a school holiday or closure day</button>
        </div>}

        {/* Discover sub-tab */}
        {exploreTab === "discover" && <div>
          {userLoc && <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12, color: "var(--color-muted)" }}><span>{"\u{1F4CD}"}</span> Showing things to do near you</div>}
          {!userLoc && <button onClick={() => { navigator.geolocation?.getCurrentPosition(pos => { const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }; db("profiles", "PATCH", { filters: ["id=eq." + user.id], body: { latitude: loc.lat, longitude: loc.lng } }) }, () => {}, { timeout: 5000 }) }} style={{ width: "100%", padding: "10px 14px", marginBottom: 12, borderRadius: 12, border: "2px dashed var(--color-border)", background: "var(--color-card)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-primary-light)", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 8 }}>{"\u{1F4CD}"} Enable location to see things to do near you</button>}
          <ThingsToDoSection allLocs={allLocs} kids={kids} userLoc={userLoc} userId={user.id} onEventAdded={() => load()} />
        </div>}

        {/* Manage Locations Modal */}
        {showLocations && <div onClick={() => setShowLocations(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10,15,20,.4)", zIndex: 70 }} />}
        {showLocations && <div style={{ position: "fixed", top: "5vh", left: 12, right: 12, zIndex: 71, background: "var(--color-card)", borderRadius: 20, boxShadow: "0 12px 40px rgba(0,0,0,.15)", padding: 20, maxHeight: "85vh", overflowY: "auto", maxWidth: 440, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, color: "var(--color-primary)" }}>Your locations</h3>
            <button onClick={() => setShowLocations(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-muted)" }}>{"\u2715"}</button>
          </div>
          <p style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 16 }}>Camps, clubs, and activities are shown near all your active locations.</p>
          {familyLocs.map(fl => <div key={fl.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{fl.label}</div>
              {fl.address && <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{fl.address}</div>}
              <div style={{ fontSize: 11, color: "var(--color-muted)" }}>Within {fl.radius_km}km</div>
            </div>
            <button onClick={async () => { try { await db("family_locations", "DELETE", { filters: ["id=eq." + fl.id] }); setFamilyLocs(prev => prev.filter(f => f.id !== fl.id)) } catch (e) { showToast("Failed to remove location.", "err") } }} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #e5e5e5", background: "none", fontSize: 11, color: "var(--color-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Remove</button>
          </div>)}
          {userLoc && !familyLocs.find(fl => Math.abs(Number(fl.latitude) - userLoc.lat) < 0.01 && Math.abs(Number(fl.longitude) - userLoc.lng) < 0.01) && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{"\u{1F4CD}"} Current location</div>
              <div style={{ fontSize: 11, color: "var(--color-muted)" }}>Detected via GPS</div>
            </div>
            <button onClick={() => setShowSaveLocModal(true)} style={{ padding: "4px 10px", borderRadius: 8, border: "1.5px solid var(--color-primary)", background: "none", fontSize: 11, color: "var(--color-primary)", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-sans)" }}>+ Save</button>
          </div>}
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setShowAddLocModal(true)} style={{ width: "100%", padding: 12, borderRadius: 12, border: "2px dashed var(--color-border)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-primary-light)", fontFamily: "var(--font-sans)" }}>+ Add a location</button>
          </div>
          <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 12, textAlign: "center" }}>Add home, work, grandparents {"\u2014"} see camps and clubs near all of them</p>
        </div>}

        {/* Save GPS Location Modal */}
        <OcvInput open={showSaveLocModal} onClose={() => setShowSaveLocModal(false)} title="Name this location" placeholder="e.g. Home, Work, Grandparents" defaultValue="Home" onSubmit={async (label) => {
          await db("family_locations", "POST", { body: { user_id: user.id, label: "\u{1F3E0} " + label, latitude: userLoc.lat, longitude: userLoc.lng, radius_km: 15, auto_source: "gps", active: true } });
          setShowSaveLocModal(false); showToast("Location saved!"); load();
        }} />

        {/* Add Location Modal */}
        {showAddLocModal && <OcvModal open={showAddLocModal} onClose={() => setShowAddLocModal(false)} title="Add a location">
          <form onSubmit={async e => {
            e.preventDefault();
            const label = e.target.locName.value.trim();
            const addr = e.target.locAddr.value.trim();
            if (!label || !addr) return;
            try {
              const r = await fetch("https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(addr + ", Ireland") + "&format=json&limit=1", { headers: { "User-Agent": "OneClubView/1.0" } });
              const d = await r.json();
              if (d && d[0]) {
                await db("family_locations", "POST", { body: { user_id: user.id, label: label, latitude: Number(d[0].lat), longitude: Number(d[0].lon), address: d[0].display_name?.split(",").slice(0, 3).join(","), radius_km: 15, auto_source: "manual", active: true } });
                setShowAddLocModal(false); showToast("Location added!"); load();
              } else { showToast("Could not find that location.", "err") }
            } catch (e) { showToast("Location search failed.", "err") }
          }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)", marginBottom: 4, display: "block" }}>Name</label>
              <input name="locName" placeholder="e.g. Work, Grandparents, Holiday home" autoFocus />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)", marginBottom: 4, display: "block" }}>Town or address</label>
              <input name="locAddr" placeholder="e.g. Stillorgan, Co. Dublin" />
            </div>
            <button type="submit" className="btn btn-primary">Add location</button>
          </form>
        </OcvModal>}

        {editClub && <EditClubModal club={editClub} kids={kids} profile={profile} userId={user.id} onClose={() => setEditClub(null)} onSaved={() => { setEditClub(null); load() }} onDelete={() => { setEditClub(null); load() }} />}
        {editHol && <EditHolidayModal holiday={editHol} userId={user.id} onClose={() => setEditHol(null)} onSaved={() => { setEditHol(null); load() }} />}
        {showAddHol && <AddHolidayModal userId={user.id} onClose={() => setShowAddHol(false)} onSaved={() => { setShowAddHol(false); load() }} />}
      </div>
    </ErrorBoundary>
  );
}
