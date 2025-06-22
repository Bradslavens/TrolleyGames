import { getProgress } from './api.js';

export function showMenu(progress, onSelectLevel) {
  const app = document.getElementById('app');
  app.innerHTML = `<h1>TrolleyGames</h1><p>Select your line and level to begin.</p>`;
  // Example: lines and levels
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
  const levels = ["HoppyTrain", "RememberBee", "SchemaPro", "SignalSlayer"];
  const menu = document.createElement('div');
  menu.className = 'menu';
  lines.forEach(line => {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'line-block';
    lineDiv.innerHTML = `<strong>${line}</strong>`;
    levels.forEach((level, idx) => {
      const btn = document.createElement('button');
      btn.textContent = level;
      btn.disabled = progress[line] == null ? idx !== 0 : idx > progress[line];
      btn.onclick = () => onSelectLevel(line, idx);
      lineDiv.appendChild(btn);
    });
    menu.appendChild(lineDiv);
  });
  app.appendChild(menu);
}

export function showOverlay(msg) {
  // Simple overlay for now
  alert(msg);
}

export function injectNavButtons(onHome) {
  let nav = document.getElementById('tg-nav');
  if (!nav) {
    nav = document.createElement('div');
    nav.id = 'tg-nav';
    nav.style.display = 'flex';
    nav.style.justifyContent = 'space-between';
    nav.style.alignItems = 'center';
    nav.style.marginBottom = '18px';
    nav.style.gap = '12px';
    nav.style.width = '100%';
    nav.style.maxWidth = '900px';
    nav.style.margin = '0 auto 18px auto';
    document.getElementById('app').prepend(nav);
  } else {
    nav.innerHTML = '';
  }
  // Home button
  const homeBtn = document.createElement('button');
  homeBtn.textContent = '🏠 Home';
  homeBtn.style.background = '#1976d2';
  homeBtn.style.color = '#fff';
  homeBtn.style.border = 'none';
  homeBtn.style.borderRadius = '6px';
  homeBtn.style.padding = '8px 18px';
  homeBtn.style.fontSize = '1em';
  homeBtn.style.cursor = 'pointer';
  homeBtn.onclick = onHome;
  nav.appendChild(homeBtn);
  // Logout button
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = '🚪 Logout';
  logoutBtn.style.background = '#e53935';
  logoutBtn.style.color = '#fff';
  logoutBtn.style.border = 'none';
  logoutBtn.style.borderRadius = '6px';
  logoutBtn.style.padding = '8px 18px';
  logoutBtn.style.fontSize = '1em';
  logoutBtn.style.cursor = 'pointer';
  logoutBtn.onclick = function() {
    localStorage.removeItem('tg_logged_in');
    localStorage.removeItem('tg_username');
    window.location.reload();
  };
  nav.appendChild(logoutBtn);
}
