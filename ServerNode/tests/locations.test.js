import { describe, it, beforeAll, afterAll } from 'vitest';
import { expect } from 'vitest';
import { createTestApp, loginAdmin } from './helpers.js';

describe('locations', () => {
  let h, session;
  beforeAll(async () => {
    h = await createTestApp();
    session = await loginAdmin(h);
  });
  afterAll(async () => { await h.cleanup(); });

  it('GET /api/locations — public', async () => {
    const res = await h.get('/api/locations');
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.locations)).toBe(true);
  });

  it('upsert and delete location', async () => {
    const upsert = await h.post('/api/admin/locations/upsert', {
      session,
      location: { id: 0, name: 'Склад №1', description: 'Главный склад' },
    });
    expect(upsert.body.status).toBe('ok');

    const list = await h.get('/api/admin/locations', { session });
    const loc = list.body.locations.find(l => l.name === 'Склад №1');
    expect(loc).toBeDefined();

    const del = await h.post('/api/admin/locations/delete', { session, id: loc.id });
    expect(del.body.status).toBe('ok');
  });

  it('upsert without name → BAD_DATA', async () => {
    const res = await h.post('/api/admin/locations/upsert', { session, location: { description: 'x' } });
    expect(res.body.error).toBe('BAD_DATA');
  });

  it('no session → FORBIDDEN', async () => {
    const res = await h.get('/api/admin/locations');
    expect(res.body.error).toBe('FORBIDDEN');
  });
});
