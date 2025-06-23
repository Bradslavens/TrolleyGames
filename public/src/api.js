import { API_BASE_URL } from "./config.js";

export async function login() {
  // Use localStorage for demo; replace with real login UI if needed
  let username = localStorage.getItem('tg_username');
  if (!username) {
    username = prompt('Enter username:');
    if (username) localStorage.setItem('tg_username', username);
  }
  return username;
}

export async function getProgress(user) {
  // Fetch progress for all lines from server
  const lines = [
    "A Yard",
    "Blue Line North East",
    "Blue Line North West",
    "Blue Line South East",
    "Blue Line South West",
    "Orange Line East",
    "Orange Line West",
    "Green Line East",
    "Green Line West"
  ];
  const progress = {};
  for (const line of lines) {
    try {
      const res = await fetch(`${API_BASE_URL}api/get-progress?username=${encodeURIComponent(user)}&line=${encodeURIComponent(line)}`);
      const data = await res.json();
      progress[line] = data.levelIdx;
    } catch {
      progress[line] = 0;
    }
  }
  return progress;
}

export async function setProgress(user, line, levelIdx) {
  await fetch(`${API_BASE_URL}api/set-progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, line, levelIdx })
  });
}
