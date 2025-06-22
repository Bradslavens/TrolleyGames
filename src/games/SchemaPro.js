import { injectNavButtons } from '../shared.js';

const pages = [
  {
    image: "pages/page1.png",
    signals: [
      { name: "Signal 1", x: 91, y: 310 },
      { name: "Signal 2", x: 124, y: 312 },
      { name: "Signal 3", x: 138, y: 312 },
      { name: "Signal 4", x: 177, y: 313 },
      { name: "Signal 5", x: 192, y: 311 }
    ]
  },
  {
    image: "pages/page2.png",
    signals: [
      { name: "Signal 6", x: 91, y: 268 },
      { name: "Signal 7", x: 124, y: 268 },
      { name: "Signal 8", x: 143, y: 267 },
      { name: "Signal 9", x: 179, y: 267 },
      { name: "Signal 10", x: 193, y: 266 }
    ]
  }
];

const SchemaPro = {
  start(line, user, { onWin, onLose }) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    injectNavButtons(() => window.location.reload());
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
