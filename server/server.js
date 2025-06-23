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
  'http://localhost:5500', // For local static site development
  'https://trolleygames-2.onrender.com', // Your Render static site (remove trailing slash for consistency)
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

// Add signals table if not exists
const addSignalsTable = () => {
  db.run(`CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix TEXT,
    number TEXT NOT NULL,
    suffix TEXT,
    correct BOOLEAN NOT NULL DEFAULT 0,
    location TEXT,
    hitbox_x INTEGER,
    hitbox_y INTEGER,
    hitbox_width INTEGER,
    hitbox_height INTEGER,
    line TEXT NOT NULL,
    page TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
};
addSignalsTable();

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

// SIGNALS CRUD ENDPOINTS

// Get all signals
app.get('/api/signals', (req, res) => {
  const { line, page } = req.query;
  let query = 'SELECT * FROM signals';
  let params = [];
  
  if (line || page) {
    query += ' WHERE';
    const conditions = [];
    if (line) {
      conditions.push(' line = ?');
      params.push(line);
    }
    if (page) {
      conditions.push(' page = ?');
      params.push(page);
    }
    query += conditions.join(' AND');
  }
  
  query += ' ORDER BY line, page, number';
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ signals: rows || [] });
  });
});

// Get signal by ID
app.get('/api/signals/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM signals WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'Signal not found' });
    res.json({ signal: row });
  });
});

// Create new signal
app.post('/api/signals', (req, res) => {
  const { prefix, number, suffix, correct, location, hitbox_x, hitbox_y, hitbox_width, hitbox_height, line, page } = req.body;
  
  if (!number || !line) {
    return res.status(400).json({ error: 'Number and line are required fields' });
  }
  
  const query = `INSERT INTO signals 
    (prefix, number, suffix, correct, location, hitbox_x, hitbox_y, hitbox_width, hitbox_height, line, page) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [prefix || '', number, suffix || '', correct ? 1 : 0, location || '', 
                 hitbox_x || 0, hitbox_y || 0, hitbox_width || 0, hitbox_height || 0, line, page || ''];
  
  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: 'DB error: ' + err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// Update signal
app.put('/api/signals/:id', (req, res) => {
  const { id } = req.params;
  const { prefix, number, suffix, correct, location, hitbox_x, hitbox_y, hitbox_width, hitbox_height, line, page } = req.body;
  
  if (!number || !line) {
    return res.status(400).json({ error: 'Number and line are required fields' });
  }
  
  const query = `UPDATE signals SET 
    prefix = ?, number = ?, suffix = ?, correct = ?, location = ?, 
    hitbox_x = ?, hitbox_y = ?, hitbox_width = ?, hitbox_height = ?, 
    line = ?, page = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`;
  
  const params = [prefix || '', number, suffix || '', correct ? 1 : 0, location || '', 
                 hitbox_x || 0, hitbox_y || 0, hitbox_width || 0, hitbox_height || 0, line, page || '', id];
  
  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: 'DB error: ' + err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Signal not found' });
    res.json({ success: true });
  });
});

// Delete signal
app.delete('/api/signals/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM signals WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Signal not found' });
    res.json({ success: true });
  });
});

// Export signals in the format expected by your game
app.get('/api/signals/export/:format', (req, res) => {
  const { format } = req.params;
  
  if (format === 'correctSignals') {
    db.all('SELECT * FROM signals WHERE correct = 1 ORDER BY line, page, number', [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      
      const correctSignals = {};
      rows.forEach(signal => {
        const key = signal.line;
        if (!correctSignals[key]) {
          correctSignals[key] = [];
        }
        const signalNumber = (signal.prefix || '') + signal.number + (signal.suffix || '');
        correctSignals[key].push(signalNumber);
      });
      
      res.json({ correctSignals });
    });
  } else {
    res.status(400).json({ error: 'Invalid export format' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
