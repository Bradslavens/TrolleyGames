import { injectNavButtons } from '../shared.js';

// Function to detect the correct API base URL
function getApiBaseUrl() {
  // Use global config if available
  if (window.TROLLEY_GAMES_CONFIG && window.TROLLEY_GAMES_CONFIG.getApiBaseUrl) {
    return window.TROLLEY_GAMES_CONFIG.getApiBaseUrl();
  }
  
  // Fallback to previous logic
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.protocol === 'file:') {
    return 'http://localhost:3001';
  }
  
  const apiUrlMeta = document.querySelector('meta[name="api-url"]');
  if (apiUrlMeta && apiUrlMeta.content) {
    return apiUrlMeta.content;
  }
  
  return 'https://trolleygames-server.onrender.com';
}

// Function to load signals from database for a specific page
async function loadSignalsForPage(pageNumber, line) {
  try {
    const baseURL = getApiBaseUrl();
    const config = window.TROLLEY_GAMES_CONFIG || {};
    const timeout = config.api?.timeout || 10000;
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(
      `${baseURL}/api/signals?line=${encodeURIComponent(line)}&page=${pageNumber}`,
      { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.signals && Array.isArray(data.signals)) {
      return data.signals.map(signal => ({
        name: `${signal.prefix || ''}${signal.number}${signal.suffix || ''}`,
        x: signal.hitbox_x,
        y: signal.hitbox_y,
        width: signal.hitbox_width,
        height: signal.hitbox_height,
        correct: signal.correct
      }));
    }
    return [];
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timed out loading signals for page:', pageNumber);
    } else {
      console.error('Failed to load signals for page:', pageNumber, error);
    }
    return [];
  }
}

// Function to load pages dynamically from the pages folder
async function loadPages() {
  const pages = [];
  let pageNumber = 1;
  const config = window.TROLLEY_GAMES_CONFIG || {};
  const maxPages = config.games?.schemaPro?.maxPages || 50;
  
  while (pageNumber <= maxPages) {
    try {
      const extensions = ['jpg', 'jpeg', 'png', 'JPG', 'JPEG', 'PNG'];
      let pageFound = false;
      
      // Use Promise.allSettled to check all extensions simultaneously for better performance
      const namingConventions = [
        (num, ext) => `assets/schemapro/pages/Page_${num}.${ext}`, // Page_1.jpg
        (num, ext) => `assets/schemapro/pages/page_${num}.${ext}`  // page_1.jpg
      ];
      
      for (const nameGenerator of namingConventions) {
        if (pageFound) break;
        
        const promises = extensions.map(ext => 
          checkImageExists(nameGenerator(pageNumber, ext)).then(exists => 
            exists ? nameGenerator(pageNumber, ext) : null
          )
        );
        
        const results = await Promise.allSettled(promises);
        
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            pages.push({
              image: result.value,
              pageNumber: pageNumber,
              signals: [] // Will be loaded from database
            });
            pageFound = true;
            break;
          }
        }
      }
      
      if (!pageFound) {
        break; // No more pages found
      }
      
      pageNumber++;
    } catch (error) {
      console.error(`Error loading page ${pageNumber}:`, error);
      break;
    }
  }
  
  return pages;
}

// Helper function to check if an image exists with timeout
function checkImageExists(imagePath) {
  return new Promise((resolve) => {
    const config = window.TROLLEY_GAMES_CONFIG || {};
    const timeout = config.games?.schemaPro?.imageTimeout || 3000;
    
    const img = new Image();
    const timeoutId = setTimeout(() => {
      img.onload = img.onerror = null; // Clear handlers
      resolve(false);
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(false);
    };
    img.src = imagePath;
  });
}

const SchemaPro = {
  async start(line, user, { onWin, onLose }) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    injectNavButtons(() => {
      // Return to main menu instead of reloading
      if (onLose) {
        onLose(); // This will trigger the return to main menu in standalone mode
      } else {
        window.location.reload();
      }
    });
    
    // Load pages dynamically
    const pages = await loadPages();
    
    if (pages.length === 0) {
      app.innerHTML = `
        <div style="text-align: center; padding: 50px;">
          <h2>No schema pages found!</h2>
          <p>Please add page files (Page_1.jpg, Page_2.png, etc.) to the assets/schemapro/pages/ folder.</p>
          <p><strong>Note:</strong> If you're seeing this on a production server, ensure the pages folder and images are properly deployed.</p>
          <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">
            Retry Loading Pages
          </button>
        </div>
      `;
      return;
    }
    
    // Add game title for standalone mode
    const gameTitle = document.createElement('div');
    gameTitle.style.cssText = `
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    gameTitle.innerHTML = `
      <h2 style="margin: 0 0 5px 0;">🎯 SchemaPro</h2>
      <p style="margin: 0; opacity: 0.9; font-size: 14px;">Line: ${line}</p>
    `;
    app.appendChild(gameTitle);
    
    let currentPageIndex = 0;
    let currentSignalIndex = 0;
    let hearts = 3;
    let score = 0;
    let gameSignals = []; // Randomized signals for current page
    // UI
    const container = document.createElement('div');
    container.className = 'schemapro-container';
    
    // Game status bar
    const statusBar = document.createElement('div');
    statusBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      background: #f0f0f0;
      border-radius: 8px;
      margin-bottom: 15px;
      font-family: Arial, sans-serif;
    `;
    
    const heartsElement = document.createElement('div');
    heartsElement.id = 'hearts';
    heartsElement.style.fontSize = '24px';
    
    const scoreElement = document.createElement('div');
    scoreElement.id = 'score';
    scoreElement.style.fontWeight = 'bold';
    
    const pageInfoElement = document.createElement('div');
    pageInfoElement.id = 'page-info';
    pageInfoElement.style.fontSize = '14px';
    pageInfoElement.style.color = '#666';
    
    statusBar.appendChild(heartsElement);
    statusBar.appendChild(scoreElement);
    statusBar.appendChild(pageInfoElement);
    container.appendChild(statusBar);
    
    const signalNameElement = document.createElement('div');
    signalNameElement.id = 'signal-name';
    signalNameElement.style.cssText = `
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      padding: 15px;
      background: #e8f4fd;
      border-radius: 8px;
      margin-bottom: 15px;
      border-left: 4px solid #2196F3;
    `;
    container.appendChild(signalNameElement);
    
    const imageContainer = document.createElement('div');
    imageContainer.id = 'image-container';
    imageContainer.style.position = 'relative';
    const schemaImage = document.createElement('img');
    schemaImage.id = 'schema-image';
    schemaImage.style.maxWidth = '100%';
    imageContainer.appendChild(schemaImage);
    container.appendChild(imageContainer);
    app.appendChild(container);
    
    // Helper function to shuffle array
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    
    // Helper function to update UI elements
    function updateUI() {
      heartsElement.innerHTML = '❤️'.repeat(hearts) + '🤍'.repeat(3 - hearts);
      scoreElement.textContent = `Score: ${score}`;
      pageInfoElement.textContent = `Page ${currentPageIndex + 1} of ${pages.length}`;
    }
    
    // Helper function to reset game
    function resetGame() {
      hearts = 3;
      score = 0;
      currentPageIndex = 0;
      currentSignalIndex = 0;
      
      // Clear all overlays
      const existingOverlays = imageContainer.querySelectorAll('.overlay, .signal-label');
      existingOverlays.forEach(overlay => overlay.remove());
      
      updateUI();
      displayNextPage();
    }
    // Logic
    async function displayNextSignal() {
      const currentPage = pages[currentPageIndex];
      
      // If signals haven't been loaded for this page, load them from database
      if (currentPage.signals.length === 0) {
        signalNameElement.textContent = 'Loading signals...';
        const loadedSignals = await loadSignalsForPage(currentPage.pageNumber, line);
        
        // If no signals found in database, show message and skip to next page
        if (loadedSignals.length === 0) {
          const config = window.TROLLEY_GAMES_CONFIG || {};
          const messageTimeout = config.games?.schemaPro?.messageTimeout || 3000;
          
          signalNameElement.innerHTML = `
            <div style="color: orange;">
              No signals configured for Page ${currentPage.pageNumber}<br>
              <small>Configure signals in the admin panel, or check server connection</small>
            </div>
          `;
          setTimeout(() => {
            currentPageIndex++;
            if (currentPageIndex < pages.length) {
              displayNextPage();
            } else {
              signalNameElement.innerHTML = `
                <div style="color: green;">
                  Game Complete!<br>
                  <small>Final Score: ${score} points</small>
                </div>
              `;
              setTimeout(onWin, 1000);
            }
          }, messageTimeout);
          return;
        }
        
        // Store loaded signals and randomize them
        currentPage.signals = loadedSignals;
        gameSignals = shuffleArray(currentPage.signals);
        currentSignalIndex = 0;
      }
      
      if (currentSignalIndex < gameSignals.length) {
        const currentSignal = gameSignals[currentSignalIndex];
        signalNameElement.innerHTML = `
          <div>Find Signal: <span style="color: #2196F3;">${currentSignal.name}</span></div>
          <div style="font-size: 14px; margin-top: 5px; color: #666;">
            Signal ${currentSignalIndex + 1} of ${gameSignals.length}
          </div>
        `;
      }
    }
    
    async function displayNextPage() {
      const currentPage = pages[currentPageIndex];
      schemaImage.src = currentPage.image;
      currentSignalIndex = 0;
      gameSignals = [];
      
      // Clear any existing overlays and labels
      const existingOverlays = imageContainer.querySelectorAll('.overlay, .signal-label');
      existingOverlays.forEach(overlay => overlay.remove());
      
      updateUI();
      await displayNextSignal();
    }
    displayNextPage();
    imageContainer.onclick = (event) => {
      const rect = schemaImage.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      
      if (currentSignalIndex >= gameSignals.length) return;
      
      const currentSignal = gameSignals[currentSignalIndex];
      
      // Calculate if click is within the signal's hitbox
      const signalLeft = currentSignal.x;
      const signalTop = currentSignal.y;
      const signalRight = signalLeft + (currentSignal.width || 20);
      const signalBottom = signalTop + (currentSignal.height || 20);
      
      const isHit = clickX >= signalLeft && clickX <= signalRight && 
                   clickY >= signalTop && clickY <= signalBottom;
      
      if (isHit) {
        // Correct hit - add point and mark signal
        score++;
        
        // Create green overlay for hitbox
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.style.position = 'absolute';
        overlay.style.left = `${currentSignal.x}px`;
        overlay.style.top = `${currentSignal.y}px`;
        overlay.style.width = `${currentSignal.width || 20}px`;
        overlay.style.height = `${currentSignal.height || 20}px`;
        overlay.style.background = 'rgba(0,200,0,0.3)';
        overlay.style.borderRadius = '4px';
        overlay.style.border = '2px solid rgba(0,200,0,0.8)';
        overlay.style.pointerEvents = 'none';
        imageContainer.appendChild(overlay);
        
        // Create signal name label
        const signalLabel = document.createElement('div');
        signalLabel.className = 'signal-label';
        signalLabel.style.position = 'absolute';
        signalLabel.style.left = `${currentSignal.x}px`;
        signalLabel.style.top = `${currentSignal.y - 25}px`;
        signalLabel.style.background = 'rgba(0,200,0,0.9)';
        signalLabel.style.color = 'white';
        signalLabel.style.padding = '4px 8px';
        signalLabel.style.borderRadius = '4px';
        signalLabel.style.fontSize = '12px';
        signalLabel.style.fontWeight = 'bold';
        signalLabel.style.pointerEvents = 'none';
        signalLabel.style.whiteSpace = 'nowrap';
        signalLabel.style.zIndex = '1000';
        signalLabel.textContent = currentSignal.name;
        imageContainer.appendChild(signalLabel);
        
        currentSignalIndex++;
        updateUI();
        
        if (currentSignalIndex < gameSignals.length) {
          // Move to next signal
          setTimeout(() => {
            displayNextSignal();
          }, 500);
        } else {
          // All signals found on this page, move to next page
          signalNameElement.innerHTML = `
            <div style="color: green;">
              Page ${currentPageIndex + 1} Complete! 🎉<br>
              <small>Found all ${gameSignals.length} signals!</small>
            </div>
          `;
          setTimeout(() => {
            currentPageIndex++;
            if (currentPageIndex < pages.length) {
              displayNextPage();
            } else {
              signalNameElement.innerHTML = `
                <div style="color: green;">
                  🏆 All Pages Complete! 🏆<br>
                  <small>Final Score: ${score} points</small>
                </div>
              `;
              setTimeout(onWin, 2000);
            }
          }, 2000);
        }
      } else {
        // Wrong click - lose a heart
        hearts--;
        updateUI();
        
        // Show red indicator at click location
        const missIndicator = document.createElement('div');
        missIndicator.style.position = 'absolute';
        missIndicator.style.left = `${clickX - 10}px`;
        missIndicator.style.top = `${clickY - 10}px`;
        missIndicator.style.width = '20px';
        missIndicator.style.height = '20px';
        missIndicator.style.background = 'rgba(255,0,0,0.7)';
        missIndicator.style.borderRadius = '50%';
        missIndicator.style.pointerEvents = 'none';
        missIndicator.style.zIndex = '1001';
        missIndicator.textContent = '❌';
        missIndicator.style.display = 'flex';
        missIndicator.style.alignItems = 'center';
        missIndicator.style.justifyContent = 'center';
        missIndicator.style.fontSize = '12px';
        imageContainer.appendChild(missIndicator);
        
        // Remove miss indicator after 1 second
        setTimeout(() => {
          if (missIndicator.parentNode) {
            missIndicator.parentNode.removeChild(missIndicator);
          }
        }, 1000);
        
        if (hearts <= 0) {
          // Game over - reset
          signalNameElement.innerHTML = `
            <div style="color: red;">
              💔 Game Over! 💔<br>
              <small>You lost all your hearts. Starting over...</small>
            </div>
          `;
          setTimeout(() => {
            resetGame();
          }, 2000);
        } else {
          // Show hearts lost message briefly
          const heartsLeft = hearts;
          signalNameElement.innerHTML = `
            <div style="color: orange;">
              ❤️ Heart Lost! ${heartsLeft} remaining<br>
              <small>Keep looking for: <span style="color: #2196F3;">${currentSignal.name}</span></small>
            </div>
          `;
          setTimeout(() => {
            displayNextSignal();
          }, 1500);
        }
      }
    };
  }
};
export default SchemaPro;
