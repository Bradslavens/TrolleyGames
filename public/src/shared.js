import { getProgress } from './api.js';

export function showMenu(progress, onSelectLevel, onSelectSchemaPro) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <h1>TrolleyGames</h1>
    <p>Select your line and level to begin, or play SchemaPro standalone.</p>
  `;
  
  // Example: lines and levels
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
  const levels = ["HoppyTrain", "RememberBee", "SignalSlayer"]; // Removed SchemaPro from progression
  
  // Create main container
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '30px';
  
  // SchemaPro standalone section
  const schemaProSection = document.createElement('div');
  schemaProSection.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
    border-radius: 12px;
    color: white;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  `;
  
  const schemaProTitle = document.createElement('h2');
  schemaProTitle.textContent = '🎯 SchemaPro - Signal Finding Game';
  schemaProTitle.style.margin = '0 0 15px 0';
  schemaProSection.appendChild(schemaProTitle);
  
  const schemaProDesc = document.createElement('p');
  schemaProDesc.textContent = 'Find signals on schema diagrams using the database-driven signal locations. Features hearts system, scoring, and multiple pages!';
  schemaProDesc.style.margin = '0 0 20px 0';
  schemaProDesc.style.opacity = '0.9';
  schemaProSection.appendChild(schemaProDesc);
  
  const schemaProButton = document.createElement('button');
  schemaProButton.textContent = 'Play SchemaPro';
  schemaProButton.style.cssText = `
    background: rgba(255,255,255,0.2);
    border: 2px solid rgba(255,255,255,0.3);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    font-size: 16px;
    transition: all 0.3s ease;
  `;
  schemaProButton.onmouseover = () => {
    schemaProButton.style.background = 'rgba(255,255,255,0.3)';
    schemaProButton.style.borderColor = 'rgba(255,255,255,0.5)';
    schemaProButton.style.transform = 'translateY(-2px)';
  };
  schemaProButton.onmouseout = () => {
    schemaProButton.style.background = 'rgba(255,255,255,0.2)';
    schemaProButton.style.borderColor = 'rgba(255,255,255,0.3)';
    schemaProButton.style.transform = 'translateY(0)';
  };
  schemaProButton.onclick = () => onSelectSchemaPro();
  
  schemaProSection.appendChild(schemaProButton);
  container.appendChild(schemaProSection);
  
  // Regular levels section
  const levelsSection = document.createElement('div');
  const levelsTitle = document.createElement('h2');
  levelsTitle.textContent = '🎮 Progressive Game Levels';
  levelsTitle.style.margin = '0 0 15px 0';
  levelsSection.appendChild(levelsTitle);
  
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
  
  levelsSection.appendChild(menu);
  container.appendChild(levelsSection);
  app.appendChild(container);
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
