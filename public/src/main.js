import { login, getProgress, setProgress, getMe } from './api.js';
import { showMenu, showOverlay } from './shared.js';
import HoppyTrain from './games/HoppyTrain.js';
import RememberBee from './games/RememberBee.js';
import SchemaPro from './games/SchemaPro.js';
import SignalSlayer from './games/SignalSlayer.js';

const games = [HoppyTrain, RememberBee, SchemaPro, SignalSlayer];

async function startApp() {
  const user = await login();
  const me = await getMe();
  const progress = await getProgress(user);
  showMenu(
    progress,
    (selectedLine, levelIdx) => loadLevel(levelIdx, selectedLine, user),
    {
      isAdmin: me.isAdmin,
      onAdmin: async () => {
        const { startSchematicEditor } = await import('./adminEditor.js');
        startSchematicEditor(() => startApp());
      },
    }
  );
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

startApp();
