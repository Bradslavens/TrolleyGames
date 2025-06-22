import signals from '../../RememberBee/signals.js';

const RememberBee = {
  start(line, user, { onWin, onLose }) {
    // Set up UI
    const app = document.getElementById('app');
    app.innerHTML = '';
    // Main container
    const container = document.createElement('div');
    container.className = 'rememberbee-container';
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
    const keys = ['1','2','3','4','5','6','7','8','9','Clear','0','Submit'];
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
    function handleKey(key) {
      if (key === 'Clear') {
        userInput = '';
        updateUserEntryDisplay();
      } else if (key === 'Submit') {
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
          // Show correct answer, reset
          alert(`Incorrect! The correct answer was: ${currentSignal}`);
          currentSignalIndex = 0;
          score = 0;
          updateProgressBar();
          userInput = '';
          updateUserEntryDisplay();
        }
      } else {
        userInput += key;
        updateUserEntryDisplay();
      }
    }
    // Init
    updateUserEntryDisplay();
    updateProgressBar();
  }
};
export default RememberBee;
