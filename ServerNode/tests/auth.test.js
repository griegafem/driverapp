import { describe, it, beforeAll, afterAll } from 'vitest';
import { expect } from 'vitest';
import { createTestApp } from './helpers.js';

describe('auth', () => {
  let h;
  beforeAll(async () => { h = await createTestApp(); });
  afterAll(async () => { await h.cleanup(); });

  it('login with correct credentials', async () => {
    const res = await h.post('/api/login', { login: 'admin', password: '1' });
    expect(res.body.status).toBe('ok');
    expect(res.body.session).toBeTruthy();
    expect(res.body.role).toBe('admin');
    expect(res.body.access_key).toBeTruthy();
  });

  it('login with wrong password', async () => {
    const res = await h.post('/api/login', { login: 'admin', password: 'wrong' });
    expect(res.body.status).toBe('error');
    expect(res.body.error).toBe('WRONG_DATA');
  });

  it('login with unknown user', async () => {
    const res = await h.post('/api/login', { login: 'nobody', password: 'x' });
    expect(res.body.status).toBe('error');
    expect(res.body.error).toBe('USER_NOT_FOUND');
  });

  it('authorize with valid session', async () => {
    const loginRes = await h.post('/api/login', { login: 'admin', password: '1' });
    const token = loginRes.body.session;
    const res = await h.post('/api/authorize', { session: token });
    expect(res.body.status).toBe('ok');
    expect(res.body.role).toBe('admin');
  });

  it('authorize with invalid session', async () => {
    const res = await h.post('/api/authorize', { session: 'invalid-token' });
    expect(res.body.status).toBe('error');
  });

  it('authorize without session', async () => {
    const res = await h.post('/api/authorize', {});
    expect(res.body.status).toBe('error');
  });
});
