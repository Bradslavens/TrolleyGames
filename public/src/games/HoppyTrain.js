import { correctSignals, correctSignalsTest, USE_TEST_SIGNALS } from '../data/correctSignals.js';
import { generateDistractors } from '../data/distractors.js';
import { injectNavButtons, palette } from '../shared.js';

const HoppyTrain = {
  start(line, user, { onWin, onLose }) {
    // Set up canvas
    const app = document.getElementById('app');
    app.innerHTML = '';
    injectNavButtons(() => window.location.reload());
    const pal = palette();
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 400;
    canvas.className = 'game-canvas';
    app.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Draw text with a chunky Balatro-style outline.
    function outlinedText(text, x, y, font, fill) {
      ctx.font = font;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = pal.outline;
      ctx.strokeText(text, x, y);
      ctx.fillStyle = fill;
      ctx.fillText(text, x, y);
    }

    // Game settings
    const GRAVITY = 0.125;
    const FLAP = -3;
    const PLAYER_SIZE = 40;
    const BOX_WIDTH = 120;
    const BOX_SPEED = 1.5;
    const WORD_FONT = '700 20px "Pixelify Sans", sans-serif';
    const GROUND_HEIGHT = 30;

    // Signals
    const activeCorrectSignals = USE_TEST_SIGNALS ? correctSignalsTest : correctSignals;
    let selectedLine = line;
    // Safety: check for missing/empty data
    if (!activeCorrectSignals[selectedLine] || !Array.isArray(activeCorrectSignals[selectedLine]) || activeCorrectSignals[selectedLine].length === 0) {
      app.innerHTML = '<div class="game-message">No correct signals found for this line.<br>Please check your data.</div>';
      return;
    }
    let signalIndex = 0;
    let currentCorrectWord = activeCorrectSignals[selectedLine][signalIndex];

    // State
    let player, boxes, score, gameActive, health;
    function resetGame() {
      player = { x: 60, y: canvas.height / 2, vy: 0, size: PLAYER_SIZE };
      score = 0;
      health = 3;
      gameActive = true;
      boxes = [];
      signalIndex = 0;
      currentCorrectWord = activeCorrectSignals[selectedLine][signalIndex];
      spawnBoxes();
    }
    function spawnBoxes() {
      const correctPos = Math.floor(Math.random() * 3);
      const words = [];
      const incorrects = generateDistractors(currentCorrectWord, 2, { line: selectedLine });
      let incIdx = 0;
      for (let i = 0; i < 3; i++) {
        if (i === correctPos) {
          words.push(currentCorrectWord);
        } else {
          words.push(incorrects[incIdx++]);
        }
      }
      const sharedColumnId = Date.now() + '-' + Math.random();
      const boxHeight = canvas.height / 3;
      boxes = words.map((word, i) => ({
        x: canvas.width,
        y: i * boxHeight,
        width: BOX_WIDTH,
        height: boxHeight,
        word,
        isCorrect: word === currentCorrectWord,
        visible: true,
        columnId: sharedColumnId
      }));
    }
    function drawPlayer() {
      ctx.save();
      ctx.fillStyle = pal.gold;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pal.outline;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
    function drawBoxes() {
      boxes.forEach(box => {
        if (!box.visible) return;
        ctx.save();
        if (box.flashRed === undefined) box.flashRed = 0;
        const inset = 6;
        const bx = box.x + inset, by = box.y + inset;
        const bw = box.width - inset * 2, bh = box.height - inset * 2;
        ctx.fillStyle = (box.flashRed > 0 || box.permanentRed) ? pal.red : pal.green;
        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 12);
        ctx.fill();
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        outlinedText(box.word, box.x + box.width / 2, box.y + box.height / 2, WORD_FONT, pal.creamOnDark);
        ctx.restore();
        if (box.flashRed > 0) {
          box.flashRed--;
          if (box.flashRed === 0) box.permanentRed = true;
        }
      });
    }
    function drawScore() {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      outlinedText('Score: ' + score, 70, 42, '700 26px "Pixelify Sans", sans-serif', pal.gold);
      ctx.restore();
    }
    function drawHearts() {
      const heartSize = 28;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.globalAlpha = i < health ? 1 : 0.2;
        ctx.beginPath();
        const x = 30 + i * (heartSize + 10);
        const y = 80;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x, y - 8, x - 10, y - 18, x - 15, y - 5);
        ctx.bezierCurveTo(x - 20, y + 10, x, y + 18, x, y + 28);
        ctx.bezierCurveTo(x, y + 18, x + 20, y + 10, x + 15, y - 5);
        ctx.bezierCurveTo(x + 10, y - 18, x, y - 8, x, y);
        ctx.closePath();
        ctx.fillStyle = pal.red;
        ctx.fill();
        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }
    }
    function update() {
      if (!gameActive) return;
      player.vy += GRAVITY;
      player.y += player.vy;
      if (player.y + player.size / 2 > canvas.height - GROUND_HEIGHT) {
        player.y = canvas.height - GROUND_HEIGHT - player.size / 2;
        player.vy = -player.vy * 0.6;
        if (Math.abs(player.vy) < 1) player.vy = 0;
      }
      if (player.y - player.size / 2 < 0) {
        player.y = player.size / 2;
        player.vy = 0;
      }
      boxes.forEach(box => {
        box.x -= BOX_SPEED;
      });
      if (!window.columnCollided) window.columnCollided = {};
      if (!window.columnCollisionCount) window.columnCollisionCount = {};
      let columnCollided = window.columnCollided;
      let columnCollisionCount = window.columnCollisionCount;
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (
          box.visible &&
          player.x + player.size / 2 > box.x &&
          player.x - player.size / 2 < box.x + box.width &&
          player.y + player.size / 2 > box.y &&
          player.y - player.size / 2 < box.y + box.height
        ) {
          if (columnCollisionCount[box.columnId] === undefined) {
            columnCollisionCount[box.columnId] = 0;
          }
          if (columnCollisionCount[box.columnId] > 0) break;
          columnCollisionCount[box.columnId] = 1;
          columnCollided[box.columnId] = true;
          if (box.isCorrect) {
            box.visible = false;
            score++;
            signalIndex++;
            if (signalIndex >= activeCorrectSignals[selectedLine].length) {
              gameActive = false;
              setTimeout(onWin, 1000);
              return;
            }
            currentCorrectWord = activeCorrectSignals[selectedLine][signalIndex];
          } else {
            box.flashRed = 15;
            health--;
            if (health <= 0) {
              gameActive = false;
              setTimeout(onLose, 1000);
              return;
            }
          }
          addNextCorrectBox(box.columnId);
          break;
        }
      }
      const columns = {};
      boxes.forEach(box => {
        if (!columns[box.columnId]) columns[box.columnId] = [];
        columns[box.columnId].push(box);
      });
      for (const colId in columns) {
        const colBoxes = columns[colId];
        if (colBoxes.every(box => box.x + box.width < 0)) {
          boxes = boxes.filter(box => box.columnId !== colId);
          delete columnCollided[colId];
          delete columnCollisionCount[colId];
        }
      }
    }
    function addNextCorrectBox(columnId) {
      const correctPos = Math.floor(Math.random() * 3);
      const boxHeight = canvas.height / 3;
      const incorrects = generateDistractors(currentCorrectWord, 2, { line: selectedLine });
      let incIdx = 0;
      const sharedColumnId = Date.now() + '-' + Math.random();
      let newBoxes = [];
      for (let i = 0; i < 3; i++) {
        if (i === correctPos) {
          newBoxes.push({
            x: canvas.width,
            y: i * boxHeight,
            width: BOX_WIDTH,
            height: boxHeight,
            word: currentCorrectWord,
            isCorrect: true,
            visible: true,
            columnId: sharedColumnId
          });
        } else {
          newBoxes.push({
            x: canvas.width,
            y: i * boxHeight,
            width: BOX_WIDTH,
            height: boxHeight,
            word: incorrects[incIdx++],
            isCorrect: false,
            visible: true,
            columnId: sharedColumnId
          });
        }
      }
      boxes = boxes.concat(newBoxes);
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Felt playfield + a darker rail bed along the bottom.
      ctx.save();
      ctx.fillStyle = pal.felt;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = pal.feltDeep;
      ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
      ctx.strokeStyle = pal.outline;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - GROUND_HEIGHT);
      ctx.lineTo(canvas.width, canvas.height - GROUND_HEIGHT);
      ctx.stroke();
      ctx.restore();
      drawPlayer();
      drawBoxes();
      drawScore();
      drawHearts();
    }
    function gameLoop() {
      update();
      draw();
      if (gameActive) {
        requestAnimationFrame(gameLoop);
      }
    }
    function flap() {
      if (!gameActive) return;
      player.vy = FLAP;
    }
    // Controls
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.key === ' ') flap();
    });
    canvas.addEventListener('mousedown', flap);
    canvas.addEventListener('touchstart', flap);
    // Start game
    resetGame();
    setTimeout(() => {
      gameLoop();
    }, 500);
  }
};
export default HoppyTrain;
