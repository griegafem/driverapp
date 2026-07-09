import { describe, it, beforeAll, afterAll } from 'vitest';
import { expect } from 'vitest';
import { createTestApp, loginAdmin } from './helpers.js';

describe('users', () => {
  let h, session;
  beforeAll(async () => {
    h = await createTestApp();
    session = await loginAdmin(h);
  });
  afterAll(async () => { await h.cleanup(); });

  it('GET /api/users — admin only', async () => {
    const res = await h.get('/api/users', { session });
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.find(u => u.login === 'admin')).toBeDefined();
  });

  it('GET /api/users — no session → FORBIDDEN', async () => {
    const res = await h.get('/api/users');
    expect(res.body.error).toBe('FORBIDDEN');
  });


  it('upsert and delete user', async () => {
    const upsert = await h.post('/api/users/upsert', {
      session,
      user: { id: 0, login: 'driver1', password: 'pass123', role: 'driver', name: 'Иван', surname: 'Петров', patronymic: '', phone: '' },
    });
    expect(upsert.body.status).toBe('ok');

    // Login as new user
    const loginRes = await h.post('/api/login', { login: 'driver1', password: 'pass123' });
    expect(loginRes.body.status).toBe('ok');
    expect(loginRes.body.role).toBe('driver');

    // Delete
    const list = await h.get('/api/users', { session });
    const u = list.body.users.find(u => u.login === 'driver1');
    expect(u).toBeDefined();

    const del = await h.post('/api/users/delete', { session, id: u.id });
    expect(del.body.status).toBe('ok');
  });

  it('upsert without login/password → BAD_DATA', async () => {
    const res = await h.post('/api/users/upsert', { session, user: { name: 'Test' } });
    expect(res.body.error).toBe('BAD_DATA');
  });
});
