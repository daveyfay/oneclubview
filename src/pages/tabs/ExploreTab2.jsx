import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import { COLS, CLUB_ICONS, TTD_ICONS, CC } from '../../lib/constants';
import { showToast, getAge, calcKm, fmtDist } from '../../lib/utils';
import { db } from '../../lib/supabase';
import DateTimePicker from '../../components/modals/DateTimePicker';

/* ── Explore Tab v2 ─────────────────────────────────────────────
   Two-segment: "Clubs near you" | "Things to do"
   Category pills, redesigned cards, action buttons.
   ───────────────────────────────────────────────────────────── */

export default function ExploreTab2({ filter }) {
  const {
    kids, clubs: myClubs, familyLocs, userLoc, user, profile, load, loading,
    schoolLocs,
  } = useHubData();

  const [segment, setSegment] = useState('clubs'); // 'clubs' | 'things'

  // ── Location helpers ──
  const allLocs = useMemo(() => {
    const locs = [];
    if (userLoc) locs.push({ ...userLoc, radius: 10, label: 'Current' });
    familyLocs.forEach(fl =>
      locs.push({ lat: Number(fl.latitude), lng: Number(fl.longitude), radius: fl.radius_km || 10, label: fl.label })
    );
    if (familyLocs.length === 0)
      schoolLocs.forEach(s => locs.push({ ...s, radius: 10, label: s.name }));
    return locs;
  }, [userLoc, familyLocs, schoolLocs]);

  const primaryLoc = allLocs[0] || null;
  const primaryLabel = useMemo(() => {
    if (!primaryLoc) return null;
    const raw = primaryLoc.label || '';
    return raw.replace(/^[^\w]*\s*/, '');
  }, [primaryLoc]);

  return (
    <ErrorBoundary label="Explore">
      <div>
        {/* ── Segmented Control ── */}
        <div
          role="tablist"
          aria-label="Explore sections"
          style={{
            display: 'flex',
            gap: 0,
            background: '#ece9e4',
            borderRadius: 14,
            padding: 4,
            marginBottom: 12,
          }}
        >
          {[
            { id: 'clubs', label: 'Clubs near you' },
            { id: 'things', label: 'Things to do' },
          ].map(s => (
            <button
              key={s.id}
              role="tab"
              aria-selected={segment === s.id}
              onClick={() => setSegment(s.id)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13.5,
                fontWeight: segment === s.id ? 700 : 500,
                fontFamily: 'var(--font-sans)',
                color: segment === s.id ? 'var(--color-primary)' : '#7c8590',
                background: segment === s.id ? '#fff' : 'transparent',
                boxShadow: segment === s.id ? '0 2px 6px rgba(26,42,58,.10)' : 'none',
                transition: 'all .15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {segment === 'clubs' && (
          <ClubsView
            allLocs={allLocs}
            primaryLoc={primaryLoc}
            primaryLabel={primaryLabel}
            myClubs={myClubs}
            kids={kids}
            filter={filter}
            userId={user.id}
            onRefresh={load}
          />
        )}

        {segment === 'things' && (
          <ThingsView
            allLocs={allLocs}
            primaryLoc={primaryLoc}
            primaryLabel={primaryLabel}
            kids={kids}
            userId={user.id}
            onRefresh={load}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

/* ══════════════════════════════════════════════════════════════
   CLUBS VIEW
   ══════════════════════════════════════════════════════════════ */
function ClubsView({ allLocs, primaryLoc, primaryLabel, myClubs, kids, filter, userId, onRefresh }) {
  const [allClubs, setAllClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [addedIds, setAddedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ocv_added_clubs') || '[]')); }
    catch { return new Set(); }
  });

  const myClubIds = useMemo(() => new Set(myClubs.map(c => c.club_id)), [myClubs]);
  const radius = primaryLoc?.radius || 10;

  // Fetch all clubs once
  useEffect(() => {
    db('clubs', 'GET', {
      select: 'id,name,category,location,website_url,latitude,longitude,description,age_min,age_max',
      limit: 500,
      order: 'name.asc',
    }).then(r => {
      setAllClubs((r || []).filter(c => c.latitude));
      setLoadingClubs(false);
    });
  }, []);

  // Filter to nearby, exclude already-enrolled
  const nearby = useMemo(() => {
    if (!primaryLoc || allClubs.length === 0) return [];
    const local = allClubs
      .filter(c => !myClubIds.has(c.id))
      .map(c => {
        const dist = calcKm(primaryLoc.lat, primaryLoc.lng, Number(c.latitude), Number(c.longitude));
        return { ...c, _dist: dist };
      })
      .filter(c => c._dist <= radius)
      .sort((a, b) => a._dist - b._dist);
    return local;
  }, [allClubs, primaryLoc, myClubIds, radius]);

  // Category counts
  const catCounts = useMemo(() => {
    const counts = {};
    nearby.forEach(c => {
      const cat = c.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [nearby]);

  const sortedCats = useMemo(() =>
    Object.entries(catCounts).sort((a, b) => b[1] - a[1]),
  [catCounts]);

  const filtered = useMemo(() => {
    if (catFilter === 'all') return nearby;
    return nearby.filter(c => (c.category || 'other') === catFilter);
  }, [nearby, catFilter]);

  // Kid suitability
  const kidAges = useMemo(() =>
    kids.map(k => ({ name: k.first_name, age: getAge(k.date_of_birth) })).filter(k => k.age !== null),
  [kids]);

  function markAdded(id) {
    const next = new Set([...addedIds, id]);
    setAddedIds(next);
    try { localStorage.setItem('ocv_added_clubs', JSON.stringify([...next])); } catch {}
  }

  if (loadingClubs) return <LoadingSkeleton />;

  return (
    <div>
      {/* Context line */}
      <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>
        {primaryLabel
          ? `Clubs within ${radius} km of ${primaryLabel}`
          : 'Enable location to see clubs near you'}
      </p>

      {/* Category pills */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 14,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <CategoryPill
          active={catFilter === 'all'}
          onClick={() => setCatFilter('all')}
          label={`All \u00B7 ${nearby.length}`}
        />
        {sortedCats.map(([cat, cnt]) => {
          const info = CLUB_ICONS[cat] || CLUB_ICONS.other;
          return (
            <CategoryPill
              key={cat}
              active={catFilter === cat}
              onClick={() => setCatFilter(catFilter === cat ? 'all' : cat)}
              label={`${info.label} \u00B7 ${cnt}`}
            />
          );
        })}
      </div>

      {/* Cards */}
      <div className="explore2-grid">
        {filtered.slice(0, 20).map((club, idx) => {
          const info = CLUB_ICONS[club.category] || CLUB_ICONS.other;
          const suited = kidAges.filter(k =>
            k.age >= (club.age_min || 0) && k.age <= (club.age_max || 99)
          );
          const isAdded = addedIds.has(club.id);

          return (
            <ExploreCard key={club.id}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <TileAvatar color={info.color} letter={club.name[0]} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16.5, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {club.name}
                  </div>
                  {club.location && (
                    <div style={{ fontSize: 13, color: '#7c8590', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {club.location}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {club.description && (
                <p style={{
                  fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-text)', marginBottom: 10,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {club.description}
                </p>
              )}

              {/* Chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <Chip bg="var(--color-primary-bg)" color="var(--color-primary)">
                  {fmtDist(club._dist)}
                </Chip>
                <Chip bg="var(--color-primary-bg)" color="var(--color-primary)">
                  {info.label}
                </Chip>
                {suited.length > 0 && (
                  <Chip bg="#f1efec" color="#6b7480">
                    Suits {suited.map(k => k.name).join(', ')}
                  </Chip>
                )}
                {club.age_min != null && club.age_max != null && club.age_max <= 18 && (
                  <Chip bg="#f1efec" color="#6b7480">
                    Ages {club.age_min}&#8211;{club.age_max}
                  </Chip>
                )}
              </div>

              {/* Action button */}
              <ActionButton
                added={isAdded}
                label="Add club"
                addedLabel="On the list"
                onClick={() => { markAdded(club.id); showToast('Club added to your list!'); }}
              />
            </ExploreCard>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState message="No clubs found in this category" />
      )}
      {filtered.length > 20 && (
        <p style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center', padding: 8, marginTop: 4 }}>
          Showing 20 of {filtered.length}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   THINGS VIEW
   ══════════════════════════════════════════════════════════════ */
function ThingsView({ allLocs, primaryLoc, primaryLabel, kids, userId, onRefresh }) {
  const [things, setThings] = useState([]);
  const [loadingT, setLoadingT] = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [addedIds, setAddedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ocv_added_things') || '[]')); }
    catch { return new Set(); }
  });
  const [dpOpen, setDpOpen] = useState(false);
  const [dpItem, setDpItem] = useState(null);

  function markAdded(id) {
    const next = new Set([...addedIds, id]);
    setAddedIds(next);
    try { localStorage.setItem('ocv_added_things', JSON.stringify([...next])); } catch {}
  }

  // Fetch things_to_do
  useEffect(() => {
    setLoadingT(true);
    db('things_to_do', 'GET', { select: '*', filters: ['status=eq.active'], order: 'title.asc', limit: 100 }).then(r => {
      const all = (r || []).filter(t => t.latitude);
      if (allLocs.length === 0) { setThings(all); setLoadingT(false); return; }
      const local = all.filter(t => {
        const tLat = Number(t.latitude), tLng = Number(t.longitude);
        return allLocs.some(loc => calcKm(loc.lat, loc.lng, tLat, tLng) <= loc.radius + 5);
      });
      local.sort((a, b) => {
        const dist = t => { let m = 999; allLocs.forEach(loc => { m = Math.min(m, calcKm(loc.lat, loc.lng, Number(t.latitude), Number(t.longitude))); }); return m; };
        return dist(a) - dist(b);
      });
      // Add distance to each item
      const withDist = (local.length > 0 ? local : all).map(t => {
        let min = 999;
        allLocs.forEach(loc => { min = Math.min(min, calcKm(loc.lat, loc.lng, Number(t.latitude), Number(t.longitude))); });
        return { ...t, _dist: min < 999 ? min : null };
      });
      setThings(withDist);
      setLoadingT(false);
    });
  }, [allLocs.length]);

  // Category counts
  const catCounts = useMemo(() => {
    const counts = {};
    things.forEach(t => {
      const cat = t.category || 'outdoor';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [things]);

  const sortedCats = useMemo(() =>
    Object.entries(catCounts).sort((a, b) => b[1] - a[1]),
  [catCounts]);

  const filtered = useMemo(() => {
    if (catFilter === 'all') return things;
    return things.filter(t => (t.category || 'outdoor') === catFilter);
  }, [things, catFilter]);

  const kidAges = useMemo(() =>
    kids.map(k => ({ name: k.first_name, age: getAge(k.date_of_birth) })).filter(k => k.age !== null),
  [kids]);

  if (loadingT) return <LoadingSkeleton />;

  return (
    <div>
      {/* Context line */}
      <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>
        {allLocs.length > 0 ? 'Sorted by distance from home' : 'Add locations for distance-sorted results'}
      </p>

      {/* Category pills */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 14,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <CategoryPill
          active={catFilter === 'all'}
          onClick={() => setCatFilter('all')}
          label={`All \u00B7 ${things.length}`}
        />
        {sortedCats.map(([cat, cnt]) => {
          const info = TTD_ICONS[cat] || TTD_ICONS.outdoor;
          return (
            <CategoryPill
              key={cat}
              active={catFilter === cat}
              onClick={() => setCatFilter(catFilter === cat ? 'all' : cat)}
              label={`${info.label} \u00B7 ${cnt}`}
            />
          );
        })}
      </div>

      {/* Cards */}
      <div className="explore2-grid">
        {filtered.map(t => {
          const info = TTD_ICONS[t.category] || TTD_ICONS.outdoor;
          const suited = kidAges.filter(k =>
            k.age >= (t.age_min || 0) && k.age <= (t.age_max || 99)
          );
          const isAdded = addedIds.has(t.id);
          const isFree = t.cost_eur === null || t.cost_eur === undefined || Number(t.cost_eur) === 0;

          return (
            <ExploreCard key={t.id}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <TileAvatar color={info.color} letter={t.title[0]} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16.5, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.title}
                  </div>
                  {t.location_name && (
                    <div style={{ fontSize: 13, color: '#7c8590', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.location_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {t.description && (
                <p style={{
                  fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-text)', marginBottom: 10,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {t.description}
                </p>
              )}

              {/* Chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {t._dist !== null && t._dist !== undefined && (
                  <Chip bg="var(--color-primary-bg)" color="var(--color-primary)">
                    {fmtDist(t._dist)}
                  </Chip>
                )}
                {isFree ? (
                  <Chip bg="var(--color-primary-bg)" color="var(--color-primary)">Free</Chip>
                ) : (
                  <Chip bg="var(--color-accent-bg)" color="#c14a37">
                    {CC.currency}{t.cost_eur}
                  </Chip>
                )}
                {suited.length > 0 && (
                  <Chip bg="#f1efec" color="#6b7480">
                    Suits {suited.map(k => k.name).join(', ')}
                  </Chip>
                )}
              </div>

              {/* Action button */}
              <ActionButton
                added={isAdded}
                label="Add to schedule"
                addedLabel="On the list"
                onClick={async () => {
                  if (t.event_date) {
                    await db('manual_events', 'POST', {
                      body: {
                        user_id: userId,
                        title: t.title,
                        event_date: t.event_date + 'T' + (t.event_time || '10:00') + ':00',
                        location: t.location_name || '',
                        description: t.description || '',
                      },
                    });
                    markAdded(t.id);
                    showToast('Added to your schedule!');
                    onRefresh && onRefresh();
                  } else {
                    setDpItem(t);
                    setDpOpen(true);
                  }
                }}
              />
            </ExploreCard>
          );
        })}
      </div>

      {filtered.length === 0 && <EmptyState message="No activities match this filter" />}

      <DateTimePicker
        open={dpOpen}
        onClose={() => { setDpOpen(false); setDpItem(null); }}
        title={dpItem ? `When are you going to ${dpItem.title}?` : 'Pick a date'}
        onSelect={async (date, time) => {
          if (dpItem) {
            await db('manual_events', 'POST', {
              body: {
                user_id: userId,
                title: dpItem.title,
                event_date: date + 'T' + time + ':00',
                location: dpItem.location_name || '',
                description: dpItem.description || '',
              },
            });
            markAdded(dpItem.id);
            showToast('Added to your schedule!');
            onRefresh && onRefresh();
          }
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ══════════════════════════════════════════════════════════════ */

function TileAvatar({ color, letter }) {
  return (
    <div
      style={{
        width: 42, height: 42, borderRadius: 13,
        background: color || 'var(--color-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 17, fontWeight: 700,
        fontFamily: 'var(--font-serif)', flexShrink: 0,
      }}
    >
      {(letter || '?').toUpperCase()}
    </div>
  );
}

function ExploreCard({ children }) {
  return (
    <div
      style={{
        background: 'var(--color-card)',
        borderRadius: 18,
        border: '1px solid var(--color-border)',
        padding: 17,
        boxShadow: 'var(--shadow)',
      }}
    >
      {children}
    </div>
  );
}

function CategoryPill({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 100,
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        flexShrink: 0,
        background: active ? 'var(--color-primary)' : '#f0eeeb',
        color: active ? '#fff' : 'var(--color-muted)',
        boxShadow: active ? '0 2px 8px rgba(26,42,58,.15)' : 'none',
        transition: 'all .15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function Chip({ bg, color, children }) {
  return (
    <span
      style={{
        fontSize: 12, fontWeight: 600,
        padding: '4px 10px', borderRadius: 8,
        background: bg, color: color,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function ActionButton({ added, label, addedLabel, onClick }) {
  return (
    <button
      onClick={added ? undefined : onClick}
      disabled={added}
      className="explore2-action-btn"
      style={{
        width: '100%',
        minHeight: 44,
        padding: '11px 18px',
        borderRadius: 12,
        border: added ? 'none' : '1.5px solid var(--color-primary)',
        background: added ? 'var(--color-primary-bg)' : 'transparent',
        color: 'var(--color-primary)',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        cursor: added ? 'default' : 'pointer',
        transition: 'all .15s',
      }}
    >
      {added ? '\u2713 ' + addedLabel : label}
    </button>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ padding: 24, borderRadius: 18, border: '2px dashed var(--color-border)', textAlign: 'center' }}>
      <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>{message}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '4px 0' }}>
      <div className="skeleton-shimmer" style={{ width: 200, height: 14, borderRadius: 6, marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="skeleton-shimmer" style={{ width: 80, height: 36, borderRadius: 100 }} />
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="skeleton-shimmer" style={{ height: 160, borderRadius: 18, marginBottom: 12 }} />
      ))}
    </div>
  );
}
