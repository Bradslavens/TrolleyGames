// Integration tests for the admin role (used to gate the schematic editor).

import { beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';

// Must be set before the server module is imported (it reads these at load).
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
process.env.NODE_ENV = 'test';
process.env.ADMIN_USERNAMES = 'bossadmin';

let app;
beforeAll(async () => {
  ({ app } = await import('../server.js'));
});

async function register(username, password = 'secret123') {
  return request(app).post('/api/register').send({ username, password });
}

describe('admin role', () => {
  it('flags a user listed in ADMIN_USERNAMES on registration', async () => {
    const res = await register('bossadmin');
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(true);
  });

  it('does not flag a normal user', async () => {
    const res = await register('regular');
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(false);
  });

  it('GET /api/me reports admin status', async () => {
    // bossadmin was registered above; log in to get a fresh token.
    const login = await request(app)
      .post('/api/login')
      .send({ username: 'bossadmin', password: 'secret123' });
    const me = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.isAdmin).toBe(true);

    const normalToken = (await register('normalme')).body.token;
    const meNormal = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${normalToken}`);
    expect(meNormal.body.isAdmin).toBe(false);
  });

  it('GET /api/admin/check allows admins', async () => {
    const login = await request(app).post('/api/login').send({ username: 'bossadmin', password: 'secret123' });
    const res = await request(app)
      .get('/api/admin/check')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.admin).toBe(true);
  });

  it('GET /api/admin/check rejects non-admins with 403', async () => {
    const token = (await register('plainuser')).body.token;
    const res = await request(app)
      .get('/api/admin/check')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/check rejects anonymous with 401', async () => {
    const res = await request(app).get('/api/admin/check');
    expect(res.status).toBe(401);
  });
});
