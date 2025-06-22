import { correctSignals, correctSignalsTest, USE_TEST_SIGNALS } from '../../HoppyTrain/correctSignals.js';
import { incorrectSignals } from '../../SignalSlayer/incorrectSignals.js';

const HoppyTrain = {
  start(line, user, { onWin, onLose }) {
    // Set up canvas
    const app = document.getElementById('app');
    app.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 400;
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    app.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Game settings
    const GRAVITY = 0.125;
    const FLAP = -3;
    const PLAYER_SIZE = 40;
    const BOX_WIDTH = 120;
    const BOX_SPEED = 1.5;
    const WORD_FONT = '20px Segoe UI';
    const GROUND_HEIGHT = 30;

    // Signals
    const activeCorrectSignals = USE_TEST_SIGNALS ? correctSignalsTest : correctSignals;
    let selectedLine = line;
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
    function pickRandom(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }
    function spawnBoxes() {
      const correctPos = Math.floor(Math.random() * 3);
      const words = [];
      let usedIncorrect = [];
      const incorrectArr = incorrectSignals[selectedLine] || [];
      for (let i = 0; i < 3; i++) {
        if (i === correctPos) {
          words.push(currentCorrectWord);
        } else {
          let word;
          do {
            word = pickRandom(incorrectArr);
          } while (usedIncorrect.includes(word) || word === currentCorrectWord);
          usedIncorrect.push(word);
          words.push(word);
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
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    function drawBoxes() {
      boxes.forEach(box => {
        if (!box.visible) return;
        ctx.save();
        if (box.flashRed === undefined) box.flashRed = 0;
        if (box.flashRed > 0 || box.permanentRed) {
          ctx.fillStyle = '#e53935';
        } else {
          ctx.fillStyle = '#4caf50';
        }
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = '#fff';
        ctx.font = WORD_FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(box.word, box.x + box.width / 2, box.y + box.height / 2);
        ctx.restore();
        if (box.flashRed > 0) {
          box.flashRed--;
          if (box.flashRed === 0) box.permanentRed = true;
        }
      });
    }
    function drawScore() {
      ctx.save();
      ctx.fillStyle = '#333';
      ctx.font = '24px Segoe UI';
      ctx.fillText('Score: ' + score, 70, 40);
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
        ctx.fillStyle = '#e53935';
        ctx.fill();
        ctx.strokeStyle = '#b71c1c';
        ctx.lineWidth = 2;
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
      let usedIncorrect = [];
      const incorrectArr = incorrectSignals[selectedLine] || [];
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
          let word;
          do {
            word = pickRandom(incorrectArr);
          } while (usedIncorrect.includes(word) || word === currentCorrectWord);
          usedIncorrect.push(word);
          newBoxes.push({
            x: canvas.width,
            y: i * boxHeight,
            width: BOX_WIDTH,
            height: boxHeight,
            word,
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
      ctx.save();
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
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
