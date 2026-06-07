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

// Read the Balatro design tokens off :root so canvas games can paint with the
// same palette the CSS uses (single source of truth).
export function palette() {
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (css.getPropertyValue(name).trim() || fallback);
  return {
    felt: v('--felt', '#20655e'),
    feltDeep: v('--felt-deep', '#123c3a'),
    cream: v('--card-cream', '#f4ead2'),
    creamOnDark: v('--cream-on-dark', '#f6eedb'),
    ink: v('--ink', '#2a2018'),
    outline: v('--outline', '#17110b'),
    red: v('--mult-red', '#fe5f55'),
    redD: v('--mult-red-d', '#c8392f'),
    green: v('--green', '#4bc06f'),
    greenD: v('--green-d', '#2f8f4c'),
    blue: v('--chip-blue', '#0093ff'),
    blueD: v('--chip-blue-d', '#0061c4'),
    gold: v('--money-gold', '#f5b912'),
    goldD: v('--money-gold-d', '#c4860a'),
    font: 'Pixelify Sans, system-ui, sans-serif',
  };
}

// Balatro-style transient message. Floats above everything and auto-dismisses,
// so it survives the #app re-render that follows a win/lose.
export function showToast(msg, { tone = 'red', duration = 1500 } = {}) {
  const existing = document.getElementById('tg-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'tg-toast';
  toast.className = `tg-toast tg-toast--${tone}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  // force reflow then animate in
  void toast.offsetWidth;
  toast.classList.add('is-in');
  setTimeout(() => {
    toast.classList.remove('is-in');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

export function showOverlay(msg) {
  showToast(msg, { tone: 'red' });
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
