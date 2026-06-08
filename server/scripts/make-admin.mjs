// Flag an existing user as an admin (for the schematic coordinate editor).
//
//   node server/scripts/make-admin.mjs <username>
//
// Alternatively set ADMIN_USERNAMES in server/.env and the matching account is
// promoted automatically on its next login.

import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const username = process.argv[2];
if (!username) {
  console.error('Usage: node server/scripts/make-admin.mjs <username>');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || resolve(here, '..', 'users.db');
const db = new Database(dbPath);

const row = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
if (!row) {
  console.error(`No such user: "${username}". Register/log in once first.`);
  process.exit(1);
}
db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?').run(username);
console.log(`"${username}" is now an admin.`);
