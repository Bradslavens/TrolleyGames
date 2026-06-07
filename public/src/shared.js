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
    lineDiv.innerHTML = `<strong data-line="${line}">${line}</strong>`;
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
    document.getElementById('app').prepend(nav);
  } else {
    nav.innerHTML = '';
  }
  // Home button
  const homeBtn = document.createElement('button');
  homeBtn.className = 'tg-btn';
  homeBtn.textContent = '🏠 Home';
  homeBtn.onclick = onHome;
  nav.appendChild(homeBtn);
  // Logout button
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'tg-btn tg-btn--danger';
  logoutBtn.textContent = '🚪 Logout';
  logoutBtn.onclick = function() {
    localStorage.removeItem('tg_logged_in');
    localStorage.removeItem('tg_username');
    localStorage.removeItem('tg_token');
    window.location.reload();
  };
  nav.appendChild(logoutBtn);
}
