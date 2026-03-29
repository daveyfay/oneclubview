import { useState } from 'react';
import { au, db, SB, SK, hd, setTokens } from '../lib/supabase';
import { track, showToast } from '../lib/utils';
import Logo from '../components/Logo';
import { OcvInput } from '../components/modals';

function Auth({ onAuth, mode: im }) {
  const [showReset, setShowReset] = useState(false);
  const [mode, setMode] = useState(im || 'signup');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState(null);
  const [ld, setLd] = useState(false);

  const pwStrength = (p) => {
    if (p.length < 8) return { score: 0, label: 'Too short', color: '#dc2626' };
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    if (s <= 2) return { score: s, label: 'Weak', color: '#dc2626' };
    if (s <= 3) return { score: s, label: 'Fair', color: '#f0a500' };
    return { score: s, label: 'Strong', color: '#16a34a' };
  };

  const strength = pwStrength(pw);
  const pwMatch = pw === pw2;
  const canSignup = email.trim() && name.trim() && pw.length >= 8 && pwMatch;
  const canLogin = email.trim() && pw.length > 0;

  async function go() {
    if (mode === 'signup') {
      if (!name.trim()) {
        setErr('Please enter your name');
        return;
      }
      if (pw.length < 8) {
        setErr('Password must be at least 8 characters');
        return;
      }
      if (!pwMatch) {
        setErr("Passwords don't match");
        return;
      }
      if (strength.score <= 2) {
        setErr('Password is too weak. Add uppercase letters, numbers, or symbols.');
        return;
      }
    }

    setLd(true);
    setErr(null);

    try {
      if (mode === 'signup') {
        // Use custom signup endpoint that bypasses email confirmation
        const signupRes = await fetch(SB + '/functions/v1/auth-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: pw,
            first_name: name.trim(),
          }),
        });

        const signupData = await signupRes.json();
        if (!signupRes.ok) throw new Error(signupData.error || 'Signup failed');

        if (signupData.access_token) {
          track('sign_up', { method: 'email' });
          setTokens(signupData.access_token, signupData.refresh_token);
        }

        const u = signupData.user;
        if (!u || !u.id) throw new Error('Signup failed — please try again');

        // Check if early adopter slots available via RPC (avoids RLS issues)
        let isBeta = false;
        try {
          const rpc = await fetch(SB + '/rest/v1/rpc/early_adopter_slots_available', {
            method: 'POST',
            headers: hd(),
          });
          const rpcData = await rpc.json();
          isBeta = rpcData === true;
        } catch (e) {
          isBeta = false;
        }

        // Check if this email has a pending family invite — assign role + family_id
        const invite = await db('family_invites', 'GET', {
          filters: [
            'invited_email=eq.' + email.trim().toLowerCase(),
            'accepted_at=is.null',
          ],
          limit: 1,
        });

        const inviteRole =
          invite && invite[0] ? invite[0].role || 'admin' : 'admin';
        const familyId = invite && invite[0] ? invite[0].family_id : null;

        // Create family for new users (if not joining via invite)
        let assignFamilyId = familyId;
        if (!assignFamilyId) {
          try {
            const rpc = await fetch(SB + '/rest/v1/rpc/create_family_for_signup', {
              method: 'POST',
              headers: hd(),
              body: JSON.stringify({
                family_name: name.trim() + "'s Family",
              }),
            });
            const fid = await rpc.json();
            if (fid) assignFamilyId = fid;
          } catch (e) {
            // Silently fail if family creation fails
          }
        }

        await db('profiles', 'POST', {
          body: {
            id: u.id,
            first_name: name.trim(),
            email: email.trim(),
            trial_started_at: new Date().toISOString(),
            subscription_status: isBeta ? 'active' : 'trial',
            is_beta: isBeta || false,
            family_role: inviteRole,
            family_id: assignFamilyId || null,
          },
        });

        // Mark invite as accepted
        if (invite && invite[0]) {
          await db('family_invites', 'PATCH', {
            filters: ['id=eq.' + invite[0].id],
            body: {
              accepted_at: new Date().toISOString(),
              accepted_user_id: u.id,
            },
          });
        }

        onAuth(u);
      } else {
        const d = await au('login', { email, password: pw });
        onAuth(d.user);
      }
    } catch (e) {
      setErr(e.message);
    }

    setLd(false);
  }

  return (
    <div
      className="anim-fade"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'var(--color-warm)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo />
        </div>
        <div
          style={{
            background: 'var(--color-card)',
            borderRadius: 24,
            border: '1px solid var(--color-border)',
            padding: 28,
          }}
        >
          <div
            style={{
              display: 'flex',
              background: 'var(--color-warm)',
              borderRadius: 12,
              padding: 4,
              marginBottom: 24,
            }}
          >
            {['signup', 'login'].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setErr(null);
                }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  background: mode === m ? 'var(--color-card)' : 'transparent',
                  color: mode === m ? 'var(--color-primary)' : 'var(--color-muted)',
                }}
              >
                {m === 'signup' ? 'Sign up' : 'Log in'}
              </button>
            ))}
          </div>

          {err && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 12,
                background: 'var(--color-danger-bg, #fef2f2)',
                color: 'var(--color-danger)',
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
              />
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />

            <div>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={mode === 'signup' ? 'Create a password' : 'Password'}
                onKeyDown={(e) =>
                  e.key === 'Enter' && mode === 'login' && go()
                }
              />
              {mode === 'signup' && pw.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: 'var(--color-border)',
                    }}
                  >
                    <div
                      style={{
                        width: (strength.score / 5) * 100 + '%',
                        height: 4,
                        borderRadius: 2,
                        background: strength.color,
                        transition: 'all .3s',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: strength.color,
                    }}
                  >
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {mode === 'signup' && (
              <div>
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="Confirm password"
                  onKeyDown={(e) =>
                    e.key === 'Enter' && canSignup && go()
                  }
                />
                {pw2.length > 0 && !pwMatch && (
                  <p
                    style={{
                      fontSize: 11,
                      color: '#dc2626',
                      marginTop: 4,
                    }}
                  >
                    Passwords don't match
                  </p>
                )}
                {pw2.length > 0 && pwMatch && (
                  <p
                    style={{
                      fontSize: 11,
                      color: '#16a34a',
                      marginTop: 4,
                    }}
                  >
                    Passwords match ✓
                  </p>
                )}
              </div>
            )}

            <button
              onClick={go}
              disabled={ld || (mode === 'signup' ? !canSignup : !canLogin)}
              className="btn btn-primary"
            >
              {ld ? '...' : mode === 'signup' ? 'Start free trial' : 'Log in'}
            </button>

            {mode === 'login' && (
              <>
                <p style={{ textAlign: 'center', marginTop: 8 }}>
                  <button
                    onClick={() => setShowReset(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-muted)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      textDecoration: 'underline',
                    }}
                  >
                    Forgot password?
                  </button>
                </p>
                <OcvInput
                  open={showReset}
                  onClose={() => setShowReset(false)}
                  title="Reset password"
                  placeholder="Enter your email address"
                  onSubmit={async (em) => {
                    try {
                      const r = await fetch(SB + '/auth/v1/recover', {
                        method: 'POST',
                        headers: {
                          apikey: SK,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: em }),
                      });
                      if (r.ok) {
                        showToast('Password reset link sent! Check your inbox.');
                      } else {
                        showToast(
                          'Could not send reset email. Try again.',
                          'err'
                        );
                      }
                    } catch (e) {
                      showToast('Error: ' + e.message, 'err');
                    }
                  }}
                />
              </>
            )}

            {mode === 'signup' && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--color-muted)',
                  textAlign: 'center',
                }}
              >
                14 days free, then from €4.99/month
              </p>
            )}

            {mode === 'signup' && (
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--color-muted)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                By signing up you agree to our{' '}
                <a href="/terms" style={{ color: 'var(--color-accent)' }}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" style={{ color: 'var(--color-accent)' }}>
                  Privacy Policy
                </a>
                .
              </p>
            )}

            {mode === 'signup' && (
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--color-muted)',
                  textAlign: 'center',
                }}
              >
                Password must be 8+ characters with a mix of uppercase, numbers,
                or symbols
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
