import { API_BASE_URL } from "./config.js";
import { showLoginForm } from "./login.js";

const LINES = [
  "Blue Line North East",
  "Blue Line North West",
  "Blue Line South East",
  "Blue Line South West",
  "Orange Line East",
  "Orange Line West",
  "Green Line East",
  "Green Line West"
];

// ---- Token helpers ----
function getToken() {
  return localStorage.getItem('tg_token');
}
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}
export function logout() {
  localStorage.removeItem('tg_token');
  localStorage.removeItem('tg_username');
}

// Show the login screen and exchange credentials for a session token. Loops,
// re-rendering the form with an inline error, until the user authenticates.
// Returns the username.
export async function login() {
  // Reuse an existing session if we have one.
  const existing = localStorage.getItem('tg_username');
  if (getToken() && existing) return existing;

  let error = null;
  while (true) {
    const { username, password } = await showLoginForm({ error });

    try {
      const res = await fetch(`${API_BASE_URL}api/login-or-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('tg_token', data.token);
        localStorage.setItem('tg_username', data.username);
        return data.username;
      }
      error = data.error || 'Login failed. Please try again.';
    } catch {
      error = 'Could not reach the server. Is it running?';
    }
  }
}

// Who is the logged-in user, and are they an admin? Used to decide whether to
// show the schematic editor. Falls back to a non-admin on any error.
export async function getMe() {
  try {
    const res = await fetch(`${API_BASE_URL}api/me`, { headers: authHeaders() });
    if (!res.ok) return { username: localStorage.getItem('tg_username'), isAdmin: false };
    return await res.json();
  } catch {
    return { username: localStorage.getItem('tg_username'), isAdmin: false };
  }
}

// Fetch progress for all lines. On an auth failure, clears the session so the
// next load re-prompts for login.
export async function getProgress(user) {
  const progress = {};
  for (const line of LINES) {
    try {
      const res = await fetch(
        `${API_BASE_URL}api/get-progress?line=${encodeURIComponent(line)}`,
        { headers: authHeaders() }
      );
      if (res.status === 401) { logout(); progress[line] = 0; continue; }
      const data = await res.json();
      progress[line] = data.levelIdx;
    } catch {
      progress[line] = 0;
    }
  }
  return progress;
}

export async function setProgress(user, line, levelIdx) {
  try {
    await fetch(`${API_BASE_URL}api/set-progress`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ line, levelIdx })
    });
  } catch {
    /* best-effort; progress will resync on next load */
  }
}
