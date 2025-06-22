// Word Flyer Game
import { correctSignals, correctSignalsTest, USE_TEST_SIGNALS } from './correctSignals.js';
import { incorrectSignals } from '../SignalSlayer/incorrectSignals.js';
import '../levelProgress.js';

// Use test or production signals based on configuration
const activeCorrectSignals = USE_TEST_SIGNALS ? correctSignalsTest : correctSignals;

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
        selectedLine = Object.keys(activeCorrectSignals)[0];
    }
    signalIndex = 0;
    currentCorrectWord = activeCorrectSignals[selectedLine][signalIndex];
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
    // Create one shared columnId for all boxes in this column
    const sharedColumnId = Date.now() + '-' + Math.random();
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
        columnId: sharedColumnId // Same id for all boxes in this column
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
            ctx.fillStyle = '#e53935'; // red
        } else {
            ctx.fillStyle = '#4caf50'; // green
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
        // If box was flashing red, make it permanently red after the first flash
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
    if (!window.columnCollisionCount) window.columnCollisionCount = {};
    let columnCollided = window.columnCollided;
    let columnCollisionCount = window.columnCollisionCount;

    // Check for collision with boxes
    let correctBoxHit = false;
    for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (
            box.visible &&
            player.x + player.size / 2 > box.x &&
            player.x - player.size / 2 < box.x + box.width &&
            player.y + player.size / 2 > box.y &&
            player.y - player.size / 2 < box.y + box.height
        ) {
            // Initialize collision count for this column if it doesn't exist
            if (columnCollisionCount[box.columnId] === undefined) {
                columnCollisionCount[box.columnId] = 0;
            }
            
            // Only process the first collision for this column
            if (columnCollisionCount[box.columnId] > 0) {
                // Already collided in this column, ignore
                break;
            }
            
            // Mark this column as having been collided with
            columnCollisionCount[box.columnId] = 1;
            columnCollided[box.columnId] = true;
            if (box.isCorrect) {
                // Make correct box invisible
                box.visible = false;
                score++;
                signalIndex++;
                if (signalIndex >= activeCorrectSignals[selectedLine].length) {
                    endGame('Congratulations! You completed all signals.');
                    return;
                }
                currentCorrectWord = activeCorrectSignals[selectedLine][signalIndex];
                correctBoxHit = true;
            } else {
                // Incorrect box: lose a heart, keep box visible, flash box red
                box.flashRed = 15; // number of frames to flash red
                health--;
                if (health <= 0) {
                    endGame('Game Over!');
                    return;
                }
            }
            // Always add a new column after any collision (correct or incorrect)
            addNextCorrectBox(box.columnId);
            break;
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
            // Remove column from collision tracking and counter
            delete columnCollided[colId];
            delete columnCollisionCount[colId];
        }
    }
}

function addNextCorrectBox(columnId) {
    // Add a new correct box at a random position, keep other boxes
    const correctPos = Math.floor(Math.random() * 3);
    const boxHeight = canvas.height / 3;
    let usedIncorrect = [];
    const incorrectArr = incorrectSignals[selectedLine] || [];
    // Create one shared columnId for all boxes in this new column
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
    // Flash background red if needed
    if (window.flashRed && window.flashRed > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,0,0,0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        window.flashRed--;
    }
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
    // If completed all signals, advance to next level (no overlay)
    if (msg.startsWith('Congratulations!')) {
        const line = selectedLine;
        const currentLevel = 0; // HoppyTrain
        const nextLevel = currentLevel + 1; // RememberBee
        console.log('[HoppyTrain] Attempting to set progress:', { line, nextLevel });
        TG_Level.setProgress(line, nextLevel)
            .then(() => {
                console.log('[HoppyTrain] Progress set successfully for', line, 'to', nextLevel);
                setTimeout(() => {
                    window.location.href = '../RememberBee/index.html?line=' + encodeURIComponent(line);
                }, 2000);
            })
            .catch(err => {
                console.error('[HoppyTrain] Error setting progress:', err);
                alert('Error saving progress. Please check your connection or contact support.');
            });
        return;
    }
    // For game over, show overlay and allow restart
    gameOverMsg.textContent = msg + ' Final Score: ' + score;
    gameOverScreen.style.display = 'flex';
    restartBtn.disabled = false;
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
