// ---------------------------------------------------------------------------
// Shared backend/auth helpers — split out of ClairMDEHR.jsx so LandingPage.jsx
// (and any future entry point) can call the same real login/signup/request
// logic instead of re-implementing it. Behavior unchanged from what lived
// inline in ClairMDEHR.jsx; this is a pure extraction, not a rewrite.
// ---------------------------------------------------------------------------

// Resolution order: an explicit localStorage override (useful for
// pointing a deployed frontend at a different backend temporarily,
// without a rebuild) — then VITE_API_BASE, baked in at build time by
// Vite (see vite.config.js; this is undefined in the esbuild --bundle=
// false parse check this file is also validated with, which is fine,
// import.meta.env just isn't populated outside an actual Vite build) —
// then the localhost default this file has always used for local dev.
export function getApiBase() {
  if (typeof localStorage !== "undefined" && localStorage.getItem("clair_api_base")) {
    return localStorage.getItem("clair_api_base");
  }
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  return "http://localhost:4000/api";
}

export function getAuthToken() {
  return typeof localStorage !== "undefined" ? localStorage.getItem("clair_auth_token") : null;
}
export function setAuthToken(token) {
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem("clair_auth_token", token);
  else localStorage.removeItem("clair_auth_token");
}

export async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getAuthToken();
    if (!token) throw new Error("Not connected to the backend yet — log in or sign up below first.");
    headers.Authorization = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(`Couldn't reach the backend at ${getApiBase()} — is clairmd-backend running? (${err.message})`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Backend request failed (${res.status}).`);
  return data;
}

export async function backendSignup({ accountType, email, password, displayName, licenseNumber }) {
  const data = await apiRequest("/auth/signup", { method: "POST", auth: false, body: { accountType, email, password, displayName, licenseNumber } });
  setAuthToken(data.token);
  return data.account;
}

export async function backendLogin({ email, password }) {
  const data = await apiRequest("/auth/login", { method: "POST", auth: false, body: { email, password } });
  setAuthToken(data.token);
  const me = await apiRequest("/auth/me");
  return me.account;
}

export function backendLogout() {
  setAuthToken(null);
}
