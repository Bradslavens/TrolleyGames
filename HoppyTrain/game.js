// Word Flyer Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameOverMsg = document.getElementById('gameOverMsg');
const restartBtn = document.getElementById('restartBtn');

// Game settings
const GRAVITY = 0.25; // Reduced gravity by 50%
const FLAP = -8;
const PLAYER_SIZE = 40;
const BOX_WIDTH = 80;
const BOX_HEIGHT = 100;
const GAP = 30;
const BOX_SPEED = 2.5;
const WORD_FONT = '20px Segoe UI';

// Word lists
const correctWords = ['apple', 'banana', 'grape', 'orange', 'lemon'];
const incorrectWords = ['car', 'table', 'shoe', 'cloud', 'river', 'chair', 'book', 'phone'];

let player, boxes, score, gameActive, currentCorrectWord;

function resetGame() {
    player = {
        x: 60,
        y: canvas.height / 2,
        vy: 0,
        size: PLAYER_SIZE
    };
    score = 0;
    gameActive = true;
    boxes = [];
    spawnBoxes();
    currentCorrectWord = pickRandom(correctWords);
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function spawnBoxes() {
    // Pick a random position (0, 1, 2) for the correct word
    const correctPos = Math.floor(Math.random() * 3);
    const words = [];
    let usedIncorrect = [];
    for (let i = 0; i < 3; i++) {
        if (i === correctPos) {
            words.push(currentCorrectWord);
        } else {
            let word;
            do {
                word = pickRandom(incorrectWords);
            } while (usedIncorrect.includes(word) || word === currentCorrectWord);
            usedIncorrect.push(word);
            words.push(word);
        }
    }
    // Stack boxes vertically, with a gap between
    const totalHeight = 3 * BOX_HEIGHT + 2 * GAP;
    const startY = (canvas.height - totalHeight) / 2;
    boxes = words.map((word, i) => ({
        x: canvas.width,
        y: startY + i * (BOX_HEIGHT + GAP),
        width: BOX_WIDTH,
        height: BOX_HEIGHT,
        word,
        isCorrect: word === currentCorrectWord
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
        ctx.save();
        ctx.fillStyle = box.isCorrect ? '#4caf50' : '#e53935';
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

function update() {
    if (!gameActive) return;
    player.vy += GRAVITY;
    player.y += player.vy;

    // Move boxes
    boxes.forEach(box => {
        box.x -= BOX_SPEED;
    });

    // Check for collision with boxes
    let passed = false;
    boxes.forEach(box => {
        if (
            player.x + player.size / 2 > box.x &&
            player.x - player.size / 2 < box.x + box.width &&
            player.y + player.size / 2 > box.y &&
            player.y - player.size / 2 < box.y + box.height
        ) {
            if (box.isCorrect) {
                // Passed through correct box
                score++;
                currentCorrectWord = pickRandom(correctWords);
                spawnBoxes();
                player.vy = FLAP; // Give a boost
                passed = true;
            } else {
                // Hit wrong box
                endGame('Game Over! Wrong word.');
            }
        }
    });

    // If boxes go off screen, respawn
    if (!passed && boxes[0].x + BOX_WIDTH < 0) {
        endGame('Game Over! Missed the correct word.');
    }

    // Check for out of bounds
    if (player.y + player.size / 2 > canvas.height || player.y - player.size / 2 < 0) {
        endGame('Game Over! Out of bounds.');
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawBoxes();
    drawScore();
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

// Show start screen on load
startScreen.style.display = 'flex';
gameOverScreen.style.display = 'none';
