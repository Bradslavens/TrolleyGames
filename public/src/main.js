import { login, getProgress, setProgress } from './api.js';
import { showMenu, showOverlay } from './shared.js';
import HoppyTrain from './games/HoppyTrain.js';
import RememberBee from './games/RememberBee.js';
import SchemaPro from './games/SchemaPro.js';
import SignalSlayer from './games/SignalSlayer.js';

const games = [HoppyTrain, RememberBee, SignalSlayer]; // Removed SchemaPro from progression

async function startApp() {
  const user = await login();
  const progress = await getProgress(user);
  showMenu(progress, (selectedLine, levelIdx) => {
    loadLevel(levelIdx, selectedLine, user);
  }, (selectedLine) => {
    // SchemaPro standalone game callback
    startSchemaPro(selectedLine, user);
  });
}

function loadLevel(levelIdx, line, user) {
  const Game = games[levelIdx];
  Game.start(line, user, {
    onWin: () => {
      setProgress(user, line, levelIdx + 1);
      loadLevel(levelIdx + 1, line, user);
    },
    onLose: () => {
      showOverlay('Try again!');
      loadLevel(levelIdx, line, user); // Restart the current level after alert
    }
  });
}

function startSchemaPro(line, user) {
  SchemaPro.start(line, user, {
    onWin: () => {
      showOverlay('Congratulations! You completed SchemaPro!');
      setTimeout(() => {
        // Return to main menu
        startApp();
      }, 2000);
    },
    onLose: () => {
      showOverlay('Try again!');
      setTimeout(() => {
        // Restart SchemaPro
        startSchemaPro(line, user);
      }, 1000);
    }
  });
}

startApp();
