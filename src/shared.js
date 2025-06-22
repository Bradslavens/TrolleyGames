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
