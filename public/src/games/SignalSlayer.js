import { correctSignals, correctSignalsTest, USE_TEST_SIGNALS } from '../data/correctSignals.js';
import { generateDistractors } from '../data/distractors.js';
import { injectNavButtons, palette } from '../shared.js';

const SignalSlayer = {
  start(line, user, { onWin, onLose }) {
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
    // Game constants
    const TRACKS = 3;
    const TRACK_WIDTH = canvas.width / TRACKS;
    const SIGNAL_HEIGHT = Math.max(50, Math.floor(canvas.height / 10));
    const SIGNAL_WIDTH = TRACK_WIDTH - 20;
    const SIGNAL_SPEED = 2;
    const TRAIN_WIDTH = Math.max(12, Math.floor(TRACK_WIDTH * 0.09));
    const TRAIN_HEIGHT = TRAIN_WIDTH;
    const TRAIN_Y = canvas.height - TRAIN_HEIGHT - 30;
    // Signals
    const activeCorrectSignals = USE_TEST_SIGNALS ? correctSignalsTest : correctSignals;
    let selectedLine = line;
    let currentLineSignals = activeCorrectSignals[selectedLine];
    let currentCorrectIndex = 0;
    let signalRows = [];
    let playerTrack = 1;
    let gameOver = false;
    let gameWon = false;
    let score = 0;
    // Generate a random signal row
    function randomSignalRow() {
      const correct = currentLineSignals[currentCorrectIndex];
      const incorrects = generateDistractors(correct, 2, { line: selectedLine });
      let tracks = [0, 1, 2];
      const correctTrack = tracks.splice(Math.floor(Math.random() * tracks.length), 1)[0];
      let signals = [];
      for (let i = 0, incIdx = 0; i < 3; i++) {
        if (i === correctTrack) {
          signals.push({ name: correct, correct: true, track: i });
        } else {
          signals.push({ name: incorrects[incIdx++], correct: false, track: i });
        }
      }
      return { signals, y: -SIGNAL_HEIGHT };
    }
    function resetGame() {
      currentCorrectIndex = 0;
      signalRows = [randomSignalRow()];
      playerTrack = 1;
      gameOver = false;
      gameWon = false;
      score = 0;
    }
    function update() {
      if (gameOver) return;
      signalRows.forEach(row => row.y += SIGNAL_SPEED);
      if (signalRows.length && signalRows[0].y > canvas.height) {
        signalRows.shift();
      }
      if (signalRows.length === 0 && currentCorrectIndex < currentLineSignals.length) {
        signalRows.push(randomSignalRow());
      }
      // Collision detection
      signalRows.forEach(row => {
        if (
          row.y + SIGNAL_HEIGHT >= TRAIN_Y &&
          row.y <= TRAIN_Y + TRAIN_HEIGHT
        ) {
          const signal = row.signals[playerTrack];
          if (signal) {
            if (signal.correct) {
              row.y = canvas.height + 1;
              score++;
              currentCorrectIndex++;
              if (currentCorrectIndex < currentLineSignals.length) {
                signalRows.push(randomSignalRow());
              } else {
                gameOver = true;
                gameWon = true;
                setTimeout(onWin, 1000);
              }
            } else {
              gameOver = true;
              setTimeout(onLose, 1000);
            }
          }
        }
      });
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Felt playfield
      ctx.fillStyle = pal.felt;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Draw track separators
      ctx.strokeStyle = pal.feltDeep;
      ctx.lineWidth = 6;
      for (let i = 1; i < TRACKS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TRACK_WIDTH, 0);
        ctx.lineTo(i * TRACK_WIDTH, canvas.height);
        ctx.stroke();
      }
      // Draw signals as cream cards
      const sigFont = '700 ' + Math.max(16, Math.floor(SIGNAL_HEIGHT * 0.32)) + 'px "Pixelify Sans", sans-serif';
      signalRows.forEach(row => {
        row.signals.forEach(signal => {
          const x = signal.track * TRACK_WIDTH + 10;
          ctx.fillStyle = pal.cream;
          ctx.strokeStyle = pal.outline;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(x, row.y, SIGNAL_WIDTH, SIGNAL_HEIGHT, 10);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = pal.ink;
          ctx.font = sigFont;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(signal.name, x + SIGNAL_WIDTH / 2, row.y + SIGNAL_HEIGHT / 2);
        });
      });
      // Draw train (red body + cream window)
      const x = playerTrack * TRACK_WIDTH + (TRACK_WIDTH - TRAIN_WIDTH * 5) / 2;
      ctx.fillStyle = pal.red;
      ctx.strokeStyle = pal.outline;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x, TRAIN_Y - (TRAIN_HEIGHT * 4), TRAIN_WIDTH * 5, TRAIN_HEIGHT * 5, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = pal.creamOnDark;
      ctx.beginPath();
      ctx.roundRect(x + TRAIN_WIDTH, TRAIN_Y - (TRAIN_HEIGHT * 3), TRAIN_WIDTH * 3, TRAIN_HEIGHT * 2, 4);
      ctx.fill();
      // Draw score
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      outlinedText('Score: ' + score, 12, 34, '700 24px "Pixelify Sans", sans-serif', pal.gold);
      // Game over overlay
      if (gameOver) {
        ctx.save();
        ctx.fillStyle = 'rgba(18,60,58,0.82)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        outlinedText(gameWon ? 'Congratulations!' : 'Game Over!', centerX, centerY,
          '700 40px "Pixelify Sans", sans-serif', gameWon ? pal.gold : pal.red);
        if (!gameWon) {
          outlinedText('Press Enter to retry', centerX, centerY + 44,
            '700 18px "Pixelify Sans", sans-serif', pal.creamOnDark);
        }
        ctx.restore();
      }
    }
    function gameLoop() {
      update();
      draw();
      if (!gameOver) {
        requestAnimationFrame(gameLoop);
      }
    }
    window.addEventListener('keydown', e => {
      if (gameOver && !gameWon && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space')) {
        resetGame();
        gameLoop();
        return;
      }
      if (e.code === 'ArrowLeft' && playerTrack > 0) {
        playerTrack--;
      } else if (e.code === 'ArrowRight' && playerTrack < TRACKS - 1) {
        playerTrack++;
      }
    });
    // Start game
    resetGame();
    setTimeout(() => {
      gameLoop();
    }, 500);
  }
};
export default SignalSlayer;
