import { injectNavButtons } from '../shared.js';

// Function to load pages dynamically from the pages folder
async function loadPages() {
  const pages = [];
  let pageNumber = 1;
  
  while (true) {
    try {
      // Try to load page_1.jpg, page_1.png, etc.
      const extensions = ['jpg', 'jpeg', 'png'];
      let pageFound = false;
      
      for (const ext of extensions) {
        const imagePath = `assets/schemapro/pages/page_${pageNumber}.${ext}`;
        
        // Check if image exists by trying to load it
        const imageExists = await checkImageExists(imagePath);
        if (imageExists) {
          pages.push({
            image: imagePath,
            signals: [] // Signals will be loaded from database or configured separately
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
      app.innerHTML = '<div style="text-align: center; padding: 50px;"><h2>No schema pages found!</h2><p>Please add page files (page_1.jpg, page_2.png, etc.) to the assets/schemapro/pages/ folder.</p></div>';
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
    function displayNextSignal() {
      const currentPage = pages[currentPageIndex];
      
      // If no signals defined for this page, create placeholder signals
      if (currentPage.signals.length === 0) {
        // Add some default signals for demonstration
        // In the future, these could be loaded from the database
        currentPage.signals = [
          { name: `Page ${currentPageIndex + 1} Signal 1`, x: 100, y: 300 },
          { name: `Page ${currentPageIndex + 1} Signal 2`, x: 150, y: 300 },
          { name: `Page ${currentPageIndex + 1} Signal 3`, x: 200, y: 300 }
        ];
      }
      
      const currentSignal = currentPage.signals[currentSignalIndex];
      signalNameElement.textContent = currentSignal.name;
    }
    function displayNextPage() {
      const currentPage = pages[currentPageIndex];
      schemaImage.src = currentPage.image;
      currentSignalIndex = 0;
      displayNextSignal();
    }
    displayNextPage();
    imageContainer.onclick = (event) => {
      const rect = schemaImage.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      const currentPage = pages[currentPageIndex];
      const currentSignal = currentPage.signals[currentSignalIndex];
      const distance = Math.sqrt(
        Math.pow(clickX - currentSignal.x, 2) + Math.pow(clickY - currentSignal.y, 2)
      );
      if (distance < 20) {
        // Mark found
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.style.position = 'absolute';
        overlay.style.left = `${currentSignal.x}px`;
        overlay.style.top = `${currentSignal.y}px`;
        overlay.style.width = '24px';
        overlay.style.height = '24px';
        overlay.style.background = 'rgba(0,200,0,0.5)';
        overlay.style.borderRadius = '50%';
        imageContainer.appendChild(overlay);
        currentSignalIndex++;
        if (currentSignalIndex < currentPage.signals.length) {
          displayNextSignal();
        } else {
          currentPageIndex++;
          if (currentPageIndex < pages.length) {
            displayNextPage();
          } else {
            signalNameElement.textContent = 'Game Over!';
            setTimeout(onWin, 1000);
          }
        }
      } else {
        // Wrong click
        alert('Try again!');
        setTimeout(onLose, 500);
      }
    };
  }
};
export default SchemaPro;
