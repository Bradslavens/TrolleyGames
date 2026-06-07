// Integration tests for the TrolleyGames API.
//
// These drive the real Express app with supertest against an in-memory SQLite
// database, so they exercise auth, validation, and per-user data isolation
// exactly as production would — without touching the real users.db or a port.

import { beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';

// Must be set before the server module is imported (it reads these at load).
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
process.env.NODE_ENV = 'test';

let app;
beforeAll(async () => {
  ({ app } = await import('../server.js'));
});

// Helper: register a fresh user and return their token.
async function makeUser(username, password = 'secret123') {
  const res = await request(app)
    .post('/api/register')
    .send({ username, password });
  return res.body.token;
}

describe('health', () => {
  it('responds ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('POST /api/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'alice', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.username).toBe('alice');
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a short password', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'shorty', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  it('rejects an invalid username', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'bad name!', password: 'secret123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username/i);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/register').send({});
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate username', async () => {
    await makeUser('dupe');
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'dupe', password: 'secret123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/taken/i);
  });
});

describe('POST /api/login', () => {
  it('logs in with correct credentials', async () => {
    await makeUser('bob');
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'bob', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a wrong password', async () => {
    await makeUser('carol');
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'carol', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown user without leaking that it is unknown', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'ghost', password: 'secret123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });
});

describe('POST /api/login-or-create', () => {
  it('creates a new user on first use', async () => {
    const res = await request(app)
      .post('/api/login-or-create')
      .send({ username: 'newbie', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(true);
    expect(typeof res.body.token).toBe('string');
  });

  it('authenticates an existing user and never silently re-creates them', async () => {
    await request(app)
      .post('/api/login-or-create')
      .send({ username: 'repeat', password: 'secret123' });
    // Existing user, wrong password -> rejected, NOT a new account.
    const res = await request(app)
      .post('/api/login-or-create')
      .send({ username: 'repeat', password: 'different' });
    expect(res.status).toBe(401);
  });
});

describe('progress endpoints require authentication', () => {
  it('rejects get-progress with no token', async () => {
    const res = await request(app)
      .get('/api/get-progress')
      .query({ line: 'Orange Line East' });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await request(app)
      .get('/api/get-progress')
      .query({ line: 'Orange Line East' })
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });
});

describe('progress round-trip and validation', () => {
  it('defaults to levelIdx 0 for a new user', async () => {
    const token = await makeUser('dave');
    const res = await request(app)
      .get('/api/get-progress')
      .query({ line: 'Orange Line East' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.levelIdx).toBe(0);
  });

  it('saves and reads back progress', async () => {
    const token = await makeUser('erin');
    await request(app)
      .post('/api/set-progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ line: 'Green Line East', levelIdx: 3 });
    const res = await request(app)
      .get('/api/get-progress')
      .query({ line: 'Green Line East' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.levelIdx).toBe(3);
  });

  it('rejects an invalid line name', async () => {
    const token = await makeUser('frank');
    const res = await request(app)
      .post('/api/set-progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ line: 'Hacker Line', levelIdx: 1 });
    expect(res.status).toBe(400);
  });

  it('rejects a non-integer or out-of-range levelIdx', async () => {
    const token = await makeUser('grace');
    for (const bad of [-1, 1.5, 999, 'two', null]) {
      const res = await request(app)
        .post('/api/set-progress')
        .set('Authorization', `Bearer ${token}`)
        .send({ line: 'Green Line East', levelIdx: bad });
      expect(res.status).toBe(400);
    }
  });
});

describe('per-user data isolation', () => {
  it('does not leak one user\'s progress to another', async () => {
    const aliceToken = await makeUser('isolation-a');
    const bobToken = await makeUser('isolation-b');

    // Alice saves progress on a line.
    await request(app)
      .post('/api/set-progress')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ line: 'Blue Line North East', levelIdx: 4 });

    // Bob, with his own valid token, must see his own default (0), not Alice's.
    const res = await request(app)
      .get('/api/get-progress')
      .query({ line: 'Blue Line North East' })
      .set('Authorization', `Bearer ${bobToken}`);
    expect(res.body.levelIdx).toBe(0);
  });
});

describe('line endpoints', () => {
  it('saves and reads back the selected line', async () => {
    const token = await makeUser('heidi');
    await request(app)
      .post('/api/set-line')
      .set('Authorization', `Bearer ${token}`)
      .send({ line: 'Orange Line West' });
    const res = await request(app)
      .get('/api/get-line')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.line).toBe('Orange Line West');
  });

  it('rejects an invalid line', async () => {
    const token = await makeUser('ivan');
    const res = await request(app)
      .post('/api/set-line')
      .set('Authorization', `Bearer ${token}`)
      .send({ line: 'Nope Line' });
    expect(res.status).toBe(400);
  });
});
