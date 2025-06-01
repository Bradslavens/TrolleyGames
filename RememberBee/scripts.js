import signals from './signals.js'; // Import the signals object

// Populate the line selection dropdown
const lineSelect = document.getElementById('lineSelect');
Object.keys(signals).forEach(line => {
  const option = document.createElement('option');
  option.value = line;
  option.textContent = line;
  lineSelect.appendChild(option);
});

// Variables to track the current state
let currentLine = null;
let currentSignalIndex = 0;
let userInput = "";
let score = 0; // Track the user's score

// Add an event listener to handle line selection
lineSelect.addEventListener('change', () => {
  currentLine = lineSelect.value;
  currentSignalIndex = 0; // Reset to the first signal
  userInput = ""; // Clear user input
  score = 0; // Reset the score
  updateProgressBar(); // Reset progress bar
  // Remove the line selection element after selection
  const lineSelectionContainer = document.querySelector('.line-selection-container');
  if (lineSelectionContainer) {
    lineSelectionContainer.remove();
  }
});

// Add event listeners to keypad buttons
const keypadButtons = document.querySelectorAll('.keypad-button');
keypadButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (!currentLine) {
      showOverlay('Please Select a Line First', true);
      return;
    }
    const value = button.textContent;
    if (value === "Clear") {
      userInput = "";
      updateUserEntryDisplay();
      console.log("Input cleared");
    } else if (value === "Submit") {
      // Do nothing here; handled by submit button event below
    } else {
      userInput += value;
      updateUserEntryDisplay();
      console.log(`User Input: ${userInput}`);
    }
  });
});

// Add event listener for submit button
const submitButton = document.getElementById('submitButton');
if (submitButton) {
  submitButton.addEventListener('click', () => {
    if (currentLine) {
      const signalList = signals[currentLine].signalList;
      const currentSignal = signalList[currentSignalIndex];
      // Remove length check: always process the guess
      console.log(`User Input: ${userInput}, Current Signal: ${currentSignal}`);
      if (userInput === currentSignal) {
        console.log("Correct! Moving to the next signal.");
        score++; // Increment the score
        currentSignalIndex++; // Move to the next signal
        updateProgressBar(); // Update progress bar
        // Check if we've reached the end of the signal list
        if (currentSignalIndex >= signalList.length) {
          console.log("You've completed all signals! You won!");
          alert(`Congratulations! You completed all signals for ${currentLine} with a score of ${score}. Select another line to play again.`);
          currentSignalIndex = 0; // Restart from the beginning
          userInput = ""; // Clear user input
          score = 0; // Reset the score
          updateProgressBar(); // Reset progress bar
        }
        userInput = "";
        updateUserEntryDisplay();
      } else {
        console.log("Incorrect! Showing the correct answer.");
        showOverlay(currentSignal); // Show the overlay with the correct answer
        currentSignalIndex = 0; // Reset to the first signal after a wrong guess
        score = 0; // Reset the score after a wrong guess
        updateProgressBar(); // Reset progress bar
      }
    }
  });
}

// Function to update the user entry display
function updateUserEntryDisplay() {
  const userEntryDisplay = document.getElementById('userEntryDisplay');
  if (userEntryDisplay) {
    userEntryDisplay.textContent = `Entry: ${userInput}`;
  }
}

// Function to show the overlay with the correct answer
function showOverlay(correctAnswer, isInfo = false) {
  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');
  if (isInfo) {
    overlayContent.innerHTML = `<span class="overlay-correct-answer">${correctAnswer}</span>`;
  } else {
    overlayContent.innerHTML = `Incorrect! The correct answer was: <span class="overlay-correct-answer">${correctAnswer}</span>`;
  }
  overlay.style.display = 'flex';
  setTimeout(() => {
    overlay.style.display = 'none';
    if (!isInfo) {
      userInput = "";
      updateUserEntryDisplay();
    }
  }, 2000);
}

// Function to reset the game
function resetGame() {
  currentSignalIndex = 0; // Reset to the first signal
  userInput = ""; // Clear user input
  score = 0; // Reset the score
  updateProgressBar(); // Reset progress bar
}

// Update the user entry display with a delay before clearing
function clearUserEntryDisplayWithDelay() {
  setTimeout(() => {
    userInput = ""; // Clear user input
    updateUserEntryDisplay(); // Clear the user entry display
  }, 500); // 500ms delay
}

// Progress bar update function
function updateProgressBar() {
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');
  if (!currentLine || !progressBar || !progressLabel) {
    progressBar && (progressBar.style.width = '0%');
    progressLabel && (progressLabel.textContent = '');
    return;
  }
  const signalList = signals[currentLine].signalList;
  const total = signalList.length;
  const current = Math.min(currentSignalIndex, total);
  const percent = Math.round((current / total) * 100);
  progressBar.style.width = percent + '%';
  progressLabel.textContent = `${current} / ${total}`;
}