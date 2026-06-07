// server.js
// Express server for TrolleyGames: auth + per-user game progress.
//
// Security model:
//  - Passwords are bcrypt-hashed (bcryptjs, pure JS, no native build chain).
//  - On login/register the server issues a signed JWT. All data endpoints
//    require that token and derive the username FROM the token, so a client
//    can never read or write another user's data by passing a username.

require('dotenv').config();

const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const PORT = process.env.PORT || 3001;

// JWT secret MUST come from the environment in production. Fall back to a
// random per-boot secret in dev so we never ship a hardcoded one (tokens
// just won't survive a restart, which is fine locally).
const JWT_SECRET =
  process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn(
    '[warn] JWT_SECRET not set — using a random secret for this run only. ' +
      'Set JWT_SECRET in server/.env for stable sessions.'
  );
}
const TOKEN_TTL = '7d';

// Allowed line names — used to validate any line the client sends.
const VALID_LINES = [
  'Blue Line North East',
  'Blue Line North West',
  'Blue Line South East',
  'Blue Line South West',
  'Orange Line East',
  'Orange Line West',
  'Green Line East',
  'Green Line West',
];

const app = express();
app.set('trust proxy', 1); // correct client IPs behind Render's proxy (for rate-limit)

// ---- Security middleware ----
// Relax a few CSP directives:
//  - style-src/img-src: the games legitimately use inline styles and data: imgs.
//  - upgrade-insecure-requests is removed (set to null): helmet enables it by
//    default, which forces subresources to load over https. Browsers exempt
//    localhost, but on a plain-http LAN address (e.g. 192.168.x.x) it would
//    upgrade main.js/styles.css to https and fail, blanking the page. We serve
//    http locally/on the LAN; production sits behind Render's own https.
// Everything else keeps helmet's defaults.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'upgrade-insecure-requests': null,
      },
    },
  })
);
app.use(express.json({ limit: '10kb' })); // cap body size to blunt payload DoS

// Serve the front-end (public/) so a single `node server.js` runs the whole app
// locally on one origin. In production Render serves public/ as a separate
// static site, so this is just a convenience and does no harm there.
app.use(express.static(path.join(__dirname, '..', 'public')));

// CORS: allowlist from env (comma-separated) or sane local defaults.
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:8080,http://127.0.0.1:8080,http://localhost:5500'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, mobile) that send no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Reject cleanly with no CORS headers instead of throwing (which would
      // surface as an opaque 500). The browser blocks it; the request 200s.
      return callback(null, false);
    },
  })
);

// Rate limiters: strict on auth, looser on the rest. Skipped under test so the
// suite can fire many auth requests from one IP without tripping the limit.
const skipInTest = () => process.env.NODE_ENV === 'test';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 auth attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'Too many attempts, please try again later.' },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});
app.use('/api/', apiLimiter);

// ---- Database (synchronous, no callback nesting) ----
const db = new Database(process.env.DB_PATH || './users.db');
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    line TEXT
  );
  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    line TEXT NOT NULL,
    levelIdx INTEGER NOT NULL,
    UNIQUE(username, line)
  );
`);

// ---- Helpers ----
function signToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Express middleware: require a valid Bearer token, attach req.username.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Validate the username/password shape on auth requests.
function validateCredentials(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') {
    return 'Username and password are required';
  }
  const u = username.trim();
  if (u.length < 3 || u.length > 32) return 'Username must be 3–32 characters';
  if (!/^[A-Za-z0-9_.-]+$/.test(u)) {
    return 'Username may only contain letters, numbers, and _ . -';
  }
  if (password.length < 6 || password.length > 128) {
    return 'Password must be 6–128 characters';
  }
  return null;
}

const getUser = db.prepare('SELECT * FROM users WHERE username = ?');
const insertUser = db.prepare(
  'INSERT INTO users (username, password) VALUES (?, ?)'
);

// ---- Auth endpoints ----

// Register: explicit account creation.
app.post('/api/register', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const err = validateCredentials(username, password);
  if (err) return res.status(400).json({ error: err });
  const u = username.trim();
  if (getUser.get(u)) return res.status(409).json({ error: 'Username taken' });
  const hash = bcrypt.hashSync(password, 10);
  insertUser.run(u, hash);
  res.json({ success: true, token: signToken(u), username: u });
});

// Login: verify existing account.
app.post('/api/login', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const err = validateCredentials(username, password);
  if (err) return res.status(400).json({ error: err });
  const u = username.trim();
  const user = getUser.get(u);
  // Always run a compare to keep timing roughly constant whether or not the
  // user exists (avoids leaking which usernames are registered).
  const ok = bcrypt.compareSync(
    password,
    user ? user.password : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinv'
  );
  if (!user || !ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ success: true, token: signToken(u), username: u });
});

// Login-or-create: convenience for this personal study app. Still requires a
// valid password and still issues a token; on an existing user a wrong
// password is rejected rather than silently creating anything.
app.post('/api/login-or-create', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const err = validateCredentials(username, password);
  if (err) return res.status(400).json({ error: err });
  const u = username.trim();
  const user = getUser.get(u);
  if (user) {
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    return res.json({ success: true, token: signToken(u), username: u });
  }
  const hash = bcrypt.hashSync(password, 10);
  insertUser.run(u, hash);
  res.json({ success: true, token: signToken(u), username: u, created: true });
});

// ---- Data endpoints (all authenticated; username comes from the token) ----

const setLineStmt = db.prepare('UPDATE users SET line = ? WHERE username = ?');
const getLineStmt = db.prepare('SELECT line FROM users WHERE username = ?');
const setProgressStmt = db.prepare(`
  INSERT INTO progress (username, line, levelIdx) VALUES (?, ?, ?)
  ON CONFLICT(username, line) DO UPDATE SET levelIdx = excluded.levelIdx
`);
const getProgressStmt = db.prepare(
  'SELECT levelIdx FROM progress WHERE username = ? AND line = ?'
);

app.post('/api/set-line', requireAuth, (req, res) => {
  const { line } = req.body || {};
  if (!VALID_LINES.includes(line)) {
    return res.status(400).json({ error: 'Invalid line' });
  }
  setLineStmt.run(line, req.username);
  res.json({ success: true });
});

app.get('/api/get-line', requireAuth, (req, res) => {
  const row = getLineStmt.get(req.username);
  res.json({ line: row ? row.line : null });
});

app.post('/api/set-progress', requireAuth, (req, res) => {
  const { line, levelIdx } = req.body || {};
  if (!VALID_LINES.includes(line)) {
    return res.status(400).json({ error: 'Invalid line' });
  }
  if (!Number.isInteger(levelIdx) || levelIdx < 0 || levelIdx > 100) {
    return res.status(400).json({ error: 'Invalid levelIdx' });
  }
  setProgressStmt.run(req.username, line, levelIdx);
  res.json({ success: true });
});

app.get('/api/get-progress', requireAuth, (req, res) => {
  const { line } = req.query;
  if (!VALID_LINES.includes(line)) {
    return res.status(400).json({ error: 'Invalid line' });
  }
  const row = getProgressStmt.get(req.username, line);
  res.json({ levelIdx: row ? row.levelIdx : 0 });
});

// Health check (handy for Render).
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Only start listening when run directly (`node server.js`). When this module
// is imported by tests we just export the app so supertest can drive it.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, db };
