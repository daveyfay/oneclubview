import React, { useMemo } from 'react';
import { useHubData } from '../../hooks/useHubData';
import ErrorBoundary from '../../components/ErrorBoundary';
import { COLS, CC } from '../../lib/constants';
import { getAge, showToast } from '../../lib/utils';

const FORWARD_ADDRESS = 'add@in.oneclubview.com';

/* ── Family Tab ─────────────────────────────────────────────────
   Who's in the household, and who can see what.
   ───────────────────────────────────────────────────────────── */

export default function FamilyTab() {
  const { kids, clubs, profile, familyMembers, user, getMemberCol } = useHubData();

  const copyAddress = () => {
    if (!navigator.clipboard) { showToast('Copying is not supported here.', 'err'); return; }
    navigator.clipboard.writeText(FORWARD_ADDRESS)
      .then(() => showToast('Address copied'))
      .catch(() => showToast('Could not copy address.', 'err'));
  };

  // Build kid metadata: age, school class, club names
  const kidRows = useMemo(() => {
    return kids.map((k, i) => {
      const age = getAge(k.date_of_birth);
      const schoolClass = k.school_class || null;

      // Find clubs this kid is enrolled in
      const kidClubs = clubs
        .filter(c => c.dependant_id === k.id)
        .map(c => c.club_name || c.clubs?.name || '')
        .filter(Boolean);
      // Deduplicate
      const uniqueClubs = [...new Set(kidClubs)];

      const metaParts = [];
      if (age !== null) metaParts.push(String(age));
      if (schoolClass) metaParts.push(schoolClass);
      else if (k.school_name) metaParts.push(k.school_name);
      if (uniqueClubs.length > 0) metaParts.push(uniqueClubs.slice(0, 3).join(', '));

      return {
        ...k,
        _age: age,
        _meta: metaParts.join(' \u00B7 '),
        _color: COLS[i % COLS.length],
      };
    });
  }, [kids, clubs]);

  // Build adult rows
  const adultRows = useMemo(() => {
    const rows = [];
    // Current user first
    if (profile) {
      rows.push({
        id: user.id,
        first_name: profile.first_name || 'You',
        family_role: profile.family_role || 'admin',
        _color: '#8b5cf6',
        _isSelf: true,
      });
    }
    // Other family members
    familyMembers
      .filter(fm => fm.id !== user.id)
      .forEach((fm, i) => {
        rows.push({
          id: fm.id,
          first_name: fm.first_name || fm.email,
          family_role: fm.family_role || 'carer',
          _color: COLS[(kids.length + i + 1) % COLS.length],
          _isSelf: false,
        });
      });
    return rows;
  }, [profile, familyMembers, user, kids.length]);

  const totalMembers = kids.length + adultRows.length;

  // Sharing description
  const sharingTitle = useMemo(() => {
    if (adultRows.length <= 1) return 'Only you can see this family';
    if (adultRows.length === 2) return 'Both parents see everything';
    return `Shared with ${adultRows.length} adults`;
  }, [adultRows.length]);

  const sharingDesc = useMemo(() => {
    if (adultRows.length <= 1)
      return 'Invite another adult to share schedules, fees, and clubs.';
    const otherNames = adultRows.filter(a => !a._isSelf).map(a => a.first_name);
    return `${otherNames.join(' and ')} can see all kids, schedules, and fees.`;
  }, [adultRows]);

  function roleLabel(role) {
    if (role === 'admin') return 'Admin';
    if (role === 'carer') return 'Carer';
    if (role === 'viewer') return 'Viewer';
    return role || '';
  }

  return (
    <ErrorBoundary label="Family">
      <div>
        {/* Eyebrow */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: '.16em',
          color: 'var(--color-muted)', marginBottom: 8,
        }}>
          Household
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 700,
          color: 'var(--color-primary)', letterSpacing: '-.02em',
          lineHeight: 1.1, marginBottom: 8,
        }}>
          Family
        </h1>

        {/* Summary */}
        <p style={{ fontSize: 15, color: 'var(--color-muted)', marginBottom: 24 }}>
          {kids.length} kid{kids.length !== 1 ? 's' : ''} {'\u00B7'} {totalMembers} member{totalMembers !== 1 ? 's' : ''}
        </p>

        {/* ── Kid rows ── */}
        <div className="family-grid">
          {kidRows.map(k => (
            <div
              key={k.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '15px 17px',
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 18,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 13,
                background: k._color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 17, fontWeight: 700,
                fontFamily: 'var(--font-serif)', flexShrink: 0,
              }}>
                {k.first_name?.[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
                  {k.first_name}
                </div>
                {k._meta && (
                  <div style={{
                    fontSize: 13, color: 'var(--color-muted)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {k._meta}
                  </div>
                )}
              </div>
              <span style={{ color: '#cbd1d6', fontSize: 18, flexShrink: 0 }}>{'\u203A'}</span>
            </div>
          ))}
        </div>

        {/* ── Adult rows ── */}
        {adultRows.length > 0 && (
          <div className="family-grid" style={{ marginTop: kids.length > 0 ? 10 : 0 }}>
            {adultRows.map(a => (
              <div
                key={a.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '15px 17px',
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 18,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 13,
                  background: a._color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 17, fontWeight: 700,
                  fontFamily: 'var(--font-serif)', flexShrink: 0,
                }}>
                  {a.first_name?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
                    {a.first_name}{a._isSelf ? ' (you)' : ''}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                    {roleLabel(a.family_role)}
                  </div>
                </div>
                <span style={{ color: '#cbd1d6', fontSize: 18, flexShrink: 0 }}>{'\u203A'}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Sharing card ── */}
        <div style={{
          marginTop: 20,
          background: 'var(--color-primary-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          padding: '18px 20px',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 4 }}>
            {sharingTitle}
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 14 }}>
            {sharingDesc}
          </p>
          <button
            onClick={() => showToast('Invite flow coming soon!')}
            style={{
              width: '100%',
              minHeight: 44,
              padding: '11px 18px',
              borderRadius: 12,
              border: '1.5px solid var(--color-primary)',
              background: 'transparent',
              color: 'var(--color-primary)',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            Invite another adult
          </button>
        </div>

        {/* -- Forwarding card -- */}
        <div style={{
          marginTop: 10,
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          padding: '18px 20px',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
            Forward club emails
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 14 }}>
            Send any club email here and we read it for you, pulling out dates and fees and adding them to your week.
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--color-primary-bg)',
            borderRadius: 14,
            padding: '11px 12px 11px 14px',
            marginBottom: 12,
          }}>
            <span style={{
              flex: 1, minWidth: 0,
              fontFamily: 'var(--font-mono)', fontSize: 13.5,
              color: 'var(--color-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {FORWARD_ADDRESS}
            </span>
            <button
              onClick={copyAddress}
              aria-label={'Copy ' + FORWARD_ADDRESS}
              style={{
                flexShrink: 0, minHeight: 36, padding: '8px 15px',
                borderRadius: 12, border: 'none',
                background: 'var(--color-primary)', color: '#f4f7fa',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,42,58,.20)',
              }}
            >
              Copy
            </button>
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.45, margin: 0 }}>
            Forward from{' '}
            <strong style={{ color: 'var(--color-text)', fontWeight: 600 }}>
              {profile?.email || user?.email || 'your account email'}
            </strong>
            {' '}so we know the email is from you.
          </p>
        </div>
      </div>
    </ErrorBoundary>
  );
}
