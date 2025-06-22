// Word Flyer Game
import { correctSignals } from './correctSignals.js';
import { incorrectSignals } from '../SignalSlayer/incorrectSignals.js';
import '../levelProgress.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameOverMsg = document.getElementById('gameOverMsg');
const restartBtn = document.getElementById('restartBtn');

// Game settings
const GRAVITY = 0.125; // Reduced gravity by half again
const FLAP = -3; // Reduced jump speed by another 50%
const PLAYER_SIZE = 40;
const BOX_WIDTH = 120; // Wider boxes for landscape
const BOX_HEIGHT = 100;
const GAP = 30;
const BOX_SPEED = 1.5; // Slower for more reaction time
const WORD_FONT = '20px Segoe UI';
const GROUND_HEIGHT = 30;

// Word lists
// Remove incorrectWords
let player, boxes, score, gameActive, currentCorrectWord, health;
// Remove correctWords, add line selection
let selectedLine = null;
let signalIndex = 0;

// Set canvas to landscape and responsive
const GAME_WIDTH = 700;
const GAME_HEIGHT = 400;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

function resetGame() {
    player = {
        x: 60,
        y: canvas.height / 2,
        vy: 0,
        size: PLAYER_SIZE
    };
    score = 0;
    health = 3;
    gameActive = true;
    boxes = [];
    // Use selectedLine for currentCorrectWord
    if (!selectedLine) {
        selectedLine = Object.keys(correctSignals)[0];
    }
    signalIndex = 0;
    currentCorrectWord = correctSignals[selectedLine][signalIndex];
    spawnBoxes();
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function spawnBoxes() {
    // Pick a random position (0, 1, 2) for the correct word
    const correctPos = Math.floor(Math.random() * 3);
    const words = [];
    let usedIncorrect = [];
    // Use incorrectSignals for the selected line
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
    // Make boxes touch top and bottom, no gap
    const boxHeight = canvas.height / 3;
    boxes = words.map((word, i) => ({
        x: canvas.width,
        y: i * boxHeight,
        width: BOX_WIDTH,
        height: boxHeight,
        word,
        isCorrect: word === currentCorrectWord,
        visible: true, // Track visibility for correct box
        columnId: Date.now() + '-' + Math.random() // Unique id for this column
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
        ctx.fillStyle = '#4caf50';
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
        // Draw a simple heart shape
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

    // Bounce off the ground
    if (player.y + player.size / 2 > canvas.height - GROUND_HEIGHT) {
        player.y = canvas.height - GROUND_HEIGHT - player.size / 2;
        player.vy = -player.vy * 0.6;
        if (Math.abs(player.vy) < 1) player.vy = 0;
    }
    if (player.y - player.size / 2 < 0) {
        player.y = player.size / 2;
        player.vy = 0;
    }

    // Move boxes
    boxes.forEach(box => {
        box.x -= BOX_SPEED;
    });

    // Track columns that have already had a collision
    if (!window.columnCollided) window.columnCollided = {};
    let columnCollided = window.columnCollided;

    // Check for collision with boxes
    let correctBoxHit = false;
    for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (
            box.visible &&
            !columnCollided[box.columnId] &&
            player.x + player.size / 2 > box.x &&
            player.x - player.size / 2 < box.x + box.width &&
            player.y + player.size / 2 > box.y &&
            player.y - player.size / 2 < box.y + box.height
        ) {
            columnCollided[box.columnId] = true;
            if (box.isCorrect) {
                // Make correct box invisible
                box.visible = false;
                score++;
                signalIndex++;
                if (signalIndex >= correctSignals[selectedLine].length) {
                    endGame('Congratulations! You completed all signals.');
                    return;
                }
                currentCorrectWord = correctSignals[selectedLine][signalIndex];
                addNextCorrectBox(box.columnId);
                correctBoxHit = true;
                break;
            } else {
                // Incorrect box: lose a heart and make box invisible
                box.visible = false;
                health--;
                if (health <= 0) {
                    endGame('Game Over!');
                    return;
                }
                // Only lose one heart per collision
                break;
            }
        }
    }

    // Remove columns that are off screen
    const columns = {};
    boxes.forEach(box => {
        if (!columns[box.columnId]) columns[box.columnId] = [];
        columns[box.columnId].push(box);
    });
    for (const colId in columns) {
        const colBoxes = columns[colId];
        if (colBoxes.every(box => box.x + box.width < 0)) {
            // Remove all boxes in this column
            boxes = boxes.filter(box => box.columnId !== colId);
            // Remove column from collision tracking
            delete columnCollided[colId];
        }
    }
}

function addNextCorrectBox(columnId) {
    // Add a new correct box at a random position, keep other boxes
    const correctPos = Math.floor(Math.random() * 3);
    const boxHeight = canvas.height / 3;
    let usedIncorrect = [];
    const incorrectArr = incorrectSignals[selectedLine] || [];
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
                columnId: Date.now() + '-' + Math.random()
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
                columnId: Date.now() + '-' + Math.random()
            });
        }
    }
    boxes = boxes.concat(newBoxes);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw ground
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

function endGame(msg) {
    gameActive = false;
    gameOverMsg.textContent = msg + ' Final Score: ' + score;
    gameOverScreen.style.display = 'flex';
    // If completed all signals, advance to next level
    if (msg.startsWith('Congratulations!')) {
        const line = selectedLine;
        // Advance to next level
        TG_Level.getProgress(line).then(progress => {
            let nextLevel = 1;
            if (progress && typeof progress.levelIdx === 'number') {
                nextLevel = progress.levelIdx + 1;
            }
            TG_Level.setProgress(line, nextLevel).then(() => {
                // Redirect to next level if exists
                if (TG_Level.levelOrder[nextLevel]) {
                    setTimeout(() => {
                        window.location.href = TG_Level.levelOrder[nextLevel].url + '?line=' + encodeURIComponent(line);
                    }, 2000);
                }
            });
        });
    }
}

// Event listeners
startBtn.onclick = () => {
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    resetGame();
    setTimeout(() => {
        gameLoop();
    }, 1000); // 1 second delay
};
restartBtn.onclick = () => {
    gameOverScreen.style.display = 'none';
    resetGame();
    setTimeout(() => {
        gameLoop();
    }, 1000); // 1 second delay
};
window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.key === ' ') {
        flap();
    }
});
canvas.addEventListener('mousedown', flap);
canvas.addEventListener('touchstart', flap);

// Add logic to set selectedLine from UI
window.setSelectedLine = function(line) {
    selectedLine = line;
    signalIndex = 0;
    resetGame();
}

// Get line from URL parameter
function getLineFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('line');
}

// On load, set selectedLine from URL
selectedLine = getLineFromURL() || selectedLine;

// Show start screen on load
startScreen.style.display = 'flex';
gameOverScreen.style.display = 'none';
