// server.js
// Express server for TrolleyGames login

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration to allow requests only from your frontend
const allowedOrigins = [
  'https://trolleygames-1.onrender.com/', // TODO: Replace with your static site's URL
  'http://localhost:8080', // For local development
  'http://127.0.0.1:8080' // For local development
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Initialize SQLite DB
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) throw err;
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);
});

// Add line column to users table if not exists
const addLineColumn = () => {
  db.get("PRAGMA table_info(users)", (err, columns) => {
    if (err) return;
    const hasLine = Array.isArray(columns) && columns.some(col => col.name === 'line');
    if (!hasLine) {
      db.run('ALTER TABLE users ADD COLUMN line TEXT', () => {});
    }
  });
};
addLineColumn();

// Add progress table if not exists
const addProgressTable = () => {
  db.run(`CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    line TEXT,
    levelIdx INTEGER,
    UNIQUE(username, line)
  )`);
};
addProgressTable();

// Register endpoint
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function(err) {
      if (err) return res.status(400).json({ error: 'Username taken' });
      res.json({ success: true });
    });
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        res.json({ success: true });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    });
  });
});

// Login or create endpoint
app.post('/api/login-or-create', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (user) {
      // User exists, check password
      bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
          res.json({ success: true });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      });
    } else {
      // User does not exist, create
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function(err) {
          if (err) return res.status(500).json({ error: 'Could not create user' });
          res.json({ success: true });
        });
      });
    }
  });
});

// Endpoint to set/get user line
app.post('/api/set-line', (req, res) => {
  const { username, line } = req.body;
  if (!username || !line) return res.status(400).json({ error: 'Missing fields' });
  db.run('UPDATE users SET line = ? WHERE username = ?', [line, username], function(err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});
app.get('/api/get-line', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing username' });
  db.get('SELECT line FROM users WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ line: row ? row.line : null });
  });
});

// Set progress endpoint
app.post('/api/set-progress', (req, res) => {
  const { username, line, levelIdx } = req.body;
  if (!username || !line || typeof levelIdx !== 'number') return res.status(400).json({ error: 'Missing fields' });
  db.run(
    `INSERT INTO progress (username, line, levelIdx) VALUES (?, ?, ?)
     ON CONFLICT(username, line) DO UPDATE SET levelIdx=excluded.levelIdx`,
    [username, line, levelIdx],
    function(err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true });
    }
  );
});
// Get progress endpoint
app.get('/api/get-progress', (req, res) => {
  const { username, line } = req.query;
  if (!username || !line) return res.status(400).json({ error: 'Missing fields' });
  db.get('SELECT levelIdx FROM progress WHERE username = ? AND line = ?', [username, line], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ levelIdx: row ? row.levelIdx : 0 });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
