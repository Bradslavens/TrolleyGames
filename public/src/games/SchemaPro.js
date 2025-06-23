import { injectNavButtons } from '../shared.js';

// Function to load signals from database for a specific page
async function loadSignalsForPage(pageNumber, line) {
  try {
    const baseURL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://trolleygames-server.onrender.com';
    const response = await fetch(`${baseURL}/api/signals?line=${encodeURIComponent(line)}&page=page_${pageNumber}`);
    const data = await response.json();
    
    if (response.ok && data.signals) {
      return data.signals.map(signal => ({
        name: (signal.prefix || '') + signal.number + (signal.suffix || ''),
        x: signal.hitbox_x,
        y: signal.hitbox_y,
        width: signal.hitbox_width,
        height: signal.hitbox_height,
        correct: signal.correct
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to load signals for page:', error);
    return [];
  }
}

// Function to load pages dynamically from the pages folder
async function loadPages() {
  const pages = [];
  let pageNumber = 1;
  
  while (true) {
    try {
      // Try to load Page_1.jpg, Page_2.png, etc. (capitalized)
      const extensions = ['jpg', 'jpeg', 'png'];
      let pageFound = false;
      
      for (const ext of extensions) {
        const imagePath = `assets/schemapro/pages/Page_${pageNumber}.${ext}`;
        
        // Check if image exists by trying to load it
        const imageExists = await checkImageExists(imagePath);
        if (imageExists) {
          pages.push({
            image: imagePath,
            pageNumber: pageNumber,
            signals: [] // Will be loaded from database
          });
          pageFound = true;
          break;
        }
      }
      
      if (!pageFound) {
        break; // No more pages found
      }
      
      pageNumber++;
    } catch (error) {
      break;
    }
  }
  
  return pages;
}

// Helper function to check if an image exists
function checkImageExists(imagePath) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = imagePath;
  });
}

const SchemaPro = {
  async start(line, user, { onWin, onLose }) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    injectNavButtons(() => window.location.reload());
    
    // Load pages dynamically
    const pages = await loadPages();
    
    if (pages.length === 0) {
      app.innerHTML = '<div style="text-align: center; padding: 50px;"><h2>No schema pages found!</h2><p>Please add page files (Page_1.jpg, Page_2.png, etc.) to the assets/schemapro/pages/ folder.</p></div>';
      return;
    }
    
    let currentPageIndex = 0;
    let currentSignalIndex = 0;
    // UI
    const container = document.createElement('div');
    container.className = 'schemapro-container';
    const signalNameElement = document.createElement('div');
    signalNameElement.id = 'signal-name';
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
    // Logic
    async function displayNextSignal() {
      const currentPage = pages[currentPageIndex];
      
      // If signals haven't been loaded for this page, load them from database
      if (currentPage.signals.length === 0) {
        signalNameElement.textContent = 'Loading signals...';
        currentPage.signals = await loadSignalsForPage(currentPage.pageNumber, line);
        
        // If no signals found in database, show message and skip to next page
        if (currentPage.signals.length === 0) {
          signalNameElement.textContent = `No signals configured for Page ${currentPage.pageNumber}`;
          setTimeout(() => {
            currentPageIndex++;
            if (currentPageIndex < pages.length) {
              displayNextPage();
            } else {
              signalNameElement.textContent = 'Game Complete!';
              setTimeout(onWin, 1000);
            }
          }, 2000);
          return;
        }
      }
      
      if (currentSignalIndex < currentPage.signals.length) {
        const currentSignal = currentPage.signals[currentSignalIndex];
        signalNameElement.textContent = `Find: ${currentSignal.name}`;
      }
    }
    
    async function displayNextPage() {
      const currentPage = pages[currentPageIndex];
      schemaImage.src = currentPage.image;
      currentSignalIndex = 0;
      
      // Clear any existing overlays
      const existingOverlays = imageContainer.querySelectorAll('.overlay');
      existingOverlays.forEach(overlay => overlay.remove());
      
      await displayNextSignal();
    }
    displayNextPage();
    imageContainer.onclick = (event) => {
      const rect = schemaImage.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      const currentPage = pages[currentPageIndex];
      
      if (currentSignalIndex >= currentPage.signals.length) return;
      
      const currentSignal = currentPage.signals[currentSignalIndex];
      
      // Calculate if click is within the signal's hitbox
      const signalLeft = currentSignal.x;
      const signalTop = currentSignal.y;
      const signalRight = signalLeft + (currentSignal.width || 20);
      const signalBottom = signalTop + (currentSignal.height || 20);
      
      const isHit = clickX >= signalLeft && clickX <= signalRight && 
                   clickY >= signalTop && clickY <= signalBottom;
      
      if (isHit) {
        // Mark found
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.style.position = 'absolute';
        overlay.style.left = `${currentSignal.x}px`;
        overlay.style.top = `${currentSignal.y}px`;
        overlay.style.width = `${currentSignal.width || 20}px`;
        overlay.style.height = `${currentSignal.height || 20}px`;
        overlay.style.background = 'rgba(0,200,0,0.5)';
        overlay.style.borderRadius = '4px';
        overlay.style.border = '2px solid rgba(0,200,0,0.8)';
        imageContainer.appendChild(overlay);
        
        currentSignalIndex++;
        if (currentSignalIndex < currentPage.signals.length) {
          displayNextSignal();
        } else {
          // All signals found on this page, move to next page
          signalNameElement.textContent = `Page ${currentPage.pageNumber} Complete!`;
          setTimeout(() => {
            currentPageIndex++;
            if (currentPageIndex < pages.length) {
              displayNextPage();
            } else {
              signalNameElement.textContent = 'All Pages Complete!';
              setTimeout(onWin, 1000);
            }
          }, 1500);
        }
      } else {
        // Wrong click
        alert('Try again! Look for the signal more carefully.');
        setTimeout(onLose, 500);
      }
    };
  }
};
export default SchemaPro;
