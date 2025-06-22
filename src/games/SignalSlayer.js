import { correctSignals, correctSignalsTest, USE_TEST_SIGNALS } from '../../HoppyTrain/correctSignals.js';
import { incorrectSignals } from './incorrectSignals.js';

const SignalSlayer = {
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
      const lineIncorrects = incorrectSignals[selectedLine] || [];
      let incorrects = [];
      while (incorrects.length < 2 && lineIncorrects.length > 0) {
        let s = lineIncorrects[Math.floor(Math.random() * lineIncorrects.length)];
        if (s !== correct && !incorrects.includes(s)) incorrects.push(s);
      }
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
      // Draw tracks
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 4;
      for (let i = 1; i < TRACKS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TRACK_WIDTH, 0);
        ctx.lineTo(i * TRACK_WIDTH, canvas.height);
        ctx.stroke();
      }
      // Draw signals
      signalRows.forEach(row => {
        row.signals.forEach(signal => {
          const x = signal.track * TRACK_WIDTH + 10;
          ctx.fillStyle = '#fff';
          ctx.fillRect(x, row.y, SIGNAL_WIDTH, SIGNAL_HEIGHT);
          ctx.strokeStyle = '#333';
          ctx.strokeRect(x, row.y, SIGNAL_WIDTH, SIGNAL_HEIGHT);
          ctx.fillStyle = '#222';
          ctx.font = Math.max(16, Math.floor(SIGNAL_HEIGHT * 0.35)) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(signal.name, x + SIGNAL_WIDTH / 2, row.y + SIGNAL_HEIGHT / 2 + 6);
        });
      });
      // Draw train
      const x = playerTrack * TRACK_WIDTH + (TRACK_WIDTH - TRAIN_WIDTH * 5) / 2;
      ctx.fillStyle = 'red';
      ctx.fillRect(x, TRAIN_Y - (TRAIN_HEIGHT * 4), TRAIN_WIDTH * 5, TRAIN_HEIGHT * 5);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(x, TRAIN_Y - (TRAIN_HEIGHT * 4), TRAIN_WIDTH * 5, TRAIN_HEIGHT * 5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + TRAIN_WIDTH, TRAIN_Y - (TRAIN_HEIGHT * 3), TRAIN_WIDTH * 3, TRAIN_HEIGHT * 2);
      // Draw score
      ctx.fillStyle = '#222';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Score: ' + score, 10, 30);
      // Game over overlay
      if (gameOver) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        ctx.fillText(gameWon ? 'Congratulations!' : 'Game Over!', centerX, centerY);
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
