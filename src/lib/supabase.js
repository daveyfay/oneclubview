import { track } from './utils';

// ── Supabase config ──
const SB = "https://uqihwazheypvmrcrqklg.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxaWh3YXpoZXlwdm1yY3Jxa2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Nzg1MjQsImV4cCI6MjA4ODQ1NDUyNH0.n5I1lkCu7Tf1sBbIceWUdsRQtIrH7-WGc3itZAfrBKI";

let _t = null;   // access token
let _rt = null;   // refresh token
let _refreshing = null;

export { SB, SK };

// ── Headers ──
export const hd = () => ({
  apikey: SK,
  "Content-Type": "application/json",
  Authorization: "Bearer " + (_t || SK),
});

// ── Token management ──
export function setTokens(access, refresh) {
  _t = access;
  if (refresh) _rt = refresh;
  if (access) localStorage.setItem("ocv_token", access);
  if (refresh) localStorage.setItem("ocv_rt", refresh);
}

export function getToken() { return _t; }
export function getRefreshToken() { return _rt; }

export function restoreTokens() {
  _t = localStorage.getItem("ocv_token");
  _rt = localStorage.getItem("ocv_rt");
}

export function clearTokens() {
  _t = null;
  _rt = null;
  localStorage.removeItem("ocv_token");
  localStorage.removeItem("ocv_rt");
}

// ── Token refresh ──
export async function refreshToken() {
  if (!_rt) return false;
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    try {
      const r = await fetch(SB + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { apikey: SK, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: _rt }),
      });
      const d = await r.json();
      if (d.access_token) {
        track("login", { method: "email" });
        _t = d.access_token;
        _rt = d.refresh_token || _rt;
        localStorage.setItem("ocv_token", _t);
        localStorage.setItem("ocv_rt", _rt);
        return true;
      }
    } catch (e) { /* noop */ }
    return false;
  })();
  const ok = await _refreshing;
  _refreshing = null;
  return ok;
}

// ── Auth API ──
export async function au(a, b) {
  const ep = {
    signup: "/auth/v1/signup",
    login: "/auth/v1/token?grant_type=password",
    user: "/auth/v1/user",
  };
  const r = await fetch(SB + ep[a], {
    method: a === "user" ? "GET" : "POST",
    headers: hd(),
    body: a === "user" ? undefined : JSON.stringify(b),
  });
  const d = await r.json();
  if (!r.ok) {
    if (r.status === 401 && a === "user" && await refreshToken()) {
      return au(a, b);
    }
    throw new Error(d.msg || d.error_description || d.message || "Error");
  }
  if (d.access_token) {
    _t = d.access_token;
    if (d.refresh_token) {
      _rt = d.refresh_token;
      localStorage.setItem("ocv_rt", _rt);
    }
  }
  return d;
}

// ── Database (PostgREST) ──
export async function db(t, m, o = {}) {
  let u = SB + "/rest/v1/" + t;
  const p = [];
  if (o.select) p.push("select=" + encodeURIComponent(o.select));
  if (o.filters) o.filters.forEach(f => p.push(f));
  if (o.order) p.push("order=" + o.order);
  if (o.limit) p.push("limit=" + o.limit);
  if (p.length) u += "?" + p.join("&");
  if (m === "DELETE" && (!o.filters || o.filters.length === 0)) {
    console.error("db() DELETE blocked — no filters");
    return null;
  }
  const h = hd();
  if (m === "POST" || m === "PATCH") h.Prefer = "return=representation";
  let r = await fetch(u, { method: m, headers: h, body: o.body ? JSON.stringify(o.body) : undefined });
  if (r.status === 401 && _t && await refreshToken()) {
    r = await fetch(u, { method: m, headers: hd(), body: o.body ? JSON.stringify(o.body) : undefined });
  }
  if (!r.ok) {
    const errTxt = await r.text();
    console.error("DB err:", t, m, errTxt);
    return null;
  }
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

// ── RPC calls ──
export async function rpc(fn, params = {}) {
  const r = await fetch(SB + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: hd(),
    body: JSON.stringify(params),
  });
  if (!r.ok) return null;
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}
