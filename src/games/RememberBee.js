import signals from '../data/signals.js';
import { injectNavButtons } from '../shared.js';

const MAX_HEALTH = 3;

const RememberBee = {
  start(line, user, { onWin, onLose }) {
    // Set up UI
    const app = document.getElementById('app');
    app.innerHTML = '';
    injectNavButtons(() => window.location.reload());
    // Main container
    const container = document.createElement('div');
    container.className = 'rememberbee-container';
    // Health display
    const healthDisplay = document.createElement('div');
    healthDisplay.id = 'healthDisplay';
    healthDisplay.style.fontSize = '2rem';
    healthDisplay.style.marginBottom = '10px';
    container.appendChild(healthDisplay);
    // User entry display
    const userEntryDisplay = document.createElement('p');
    userEntryDisplay.id = 'userEntryDisplay';
    container.appendChild(userEntryDisplay);
    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.id = 'progressBar';
    progressBar.style.height = '20px';
    progressBar.style.background = '#eee';
    progressBar.style.margin = '10px 0';
    container.appendChild(progressBar);
    // Keypad
    const keypad = document.createElement('div');
    keypad.className = 'keypad';
    const keys = ['1','2','3','4','5','6','7','8','9','Clear','0']; // Removed 'Submit'
    keys.forEach(key => {
      const btn = document.createElement('button');
      btn.textContent = key;
      btn.onclick = () => handleKey(key);
      keypad.appendChild(btn);
    });
    container.appendChild(keypad);
    app.appendChild(container);

    // State
    let currentSignalIndex = 0;
    let userInput = '';
    let score = 0;
    let health = MAX_HEALTH;
    const signalList = signals[line].signalList;

    function updateUserEntryDisplay() {
      userEntryDisplay.textContent = userInput || '\u00A0';
    }
    function updateProgressBar() {
      const total = signalList.length;
      const current = Math.min(currentSignalIndex, total);
      progressBar.style.width = Math.round((current / total) * 100) + '%';
      progressBar.textContent = `${current} / ${total}`;
    }
    function updateHealthDisplay() {
      healthDisplay.innerHTML = '❤'.repeat(health) + '<span style="color:#ccc">' + '❤'.repeat(MAX_HEALTH - health) + '</span>';
    }
    function checkAnswer() {
      const currentSignal = signalList[currentSignalIndex];
      if (userInput === currentSignal) {
        score++;
        currentSignalIndex++;
        updateProgressBar();
        if (currentSignalIndex >= signalList.length) {
          setTimeout(onWin, 1000);
          return;
        }
        userInput = '';
        updateUserEntryDisplay();
      } else {
        health--;
        updateHealthDisplay();
        if (health > 0) {
          alert(`Incorrect! The correct answer was: ${currentSignal}\nYou have ${health} heart${health === 1 ? '' : 's'} left.`);
          userInput = '';
          updateUserEntryDisplay();
        } else {
          alert(`Incorrect! The correct answer was: ${currentSignal}\nNo hearts left. Restarting level.`);
          currentSignalIndex = 0;
          score = 0;
          health = MAX_HEALTH;
          updateProgressBar();
          updateHealthDisplay();
          userInput = '';
          updateUserEntryDisplay();
        }
      }
    }
    function handleKey(key) {
      if (key === 'Clear') {
        userInput = '';
        updateUserEntryDisplay();
      } else {
        userInput += key;
        updateUserEntryDisplay();
        const currentSignal = signalList[currentSignalIndex];
        if (userInput.length === currentSignal.length) {
          setTimeout(checkAnswer, 150); // Small delay for UI update
        }
      }
    }
    // Keyboard support for desktop/laptop
    function handleKeyDown(e) {
      if (e.repeat) return; // Ignore held keys
      if (e.key >= '0' && e.key <= '9') {
        handleKey(e.key);
        e.preventDefault();
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key.toLowerCase() === 'c') {
        handleKey('Clear');
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    // Remove event listener on exit
    app._rememberbeeCleanup = () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // Init
    updateUserEntryDisplay();
    updateProgressBar();
    updateHealthDisplay();
  }
};
// Cleanup utility for navigation
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const app = document.getElementById('app');
    if (app && app._rememberbeeCleanup) app._rememberbeeCleanup();
  });
}
export default RememberBee;
