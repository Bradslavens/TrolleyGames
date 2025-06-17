// levelProgress.js
// Handles level and line progress for TrolleyGames

const lines = [
  "Blue Line North East",
  "Blue Line North West",
  "Blue Line South East",
  "Blue Line South West",
  "Orange Line East",
  "Orange Line West",
  "Green Line East",
  "Green Line West"
];

const levelOrder = [
  { name: "HoppyTrain", url: "HoppyTrain/index.html" },
  { name: "RememberBee", url: "RememberBee/index.html" },
  { name: "SchemaPro", url: "SchemaPro/index.html" }
];

function getUsername() {
  return localStorage.getItem('tg_username');
}

async function getProgress(line) {
  const username = getUsername();
  if (!username) return null;
  const res = await fetch(`http://localhost:3001/api/get-progress?username=${encodeURIComponent(username)}&line=${encodeURIComponent(line)}`);
  return await res.json();
}

async function setProgress(line, levelIdx) {
  const username = getUsername();
  if (!username) return;
  await fetch('http://localhost:3001/api/set-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, line, levelIdx })
  });
}

window.TG_Level = {
  lines,
  levelOrder,
  getProgress,
  setProgress
};
