import { describe, it, beforeAll, afterAll } from 'vitest';
import { expect } from 'vitest';
import { createTestApp, loginAdmin } from './helpers.js';

describe('routes (маршруты)', () => {
  let h, session;
  beforeAll(async () => {
    h = await createTestApp();
    session = await loginAdmin(h);
    // Ensure test car exists
    await h.post('/api/admin/cars/upsert', {
      session,
      car: { id: 0, number: 'А001АА77', brand: 'Lada', model: 'Granta', vin: '', year: '', department: '', responsible: '', current_location: '' },
    });
  });
  afterAll(async () => { await h.cleanup(); });

  it('create route', async () => {
    const res = await h.post('/api/routes', {
      session,
      car_number: 'А001АА77',
      from_location: 'База',
      to_location: 'Офис',
    });
    expect(res.body.status).toBe('ok');
    expect(res.body.route.car_number).toBe('А001АА77');
    expect(res.body.route.status).toBe('active');
  });

  it('CAR_BUSY when creating second route for same car', async () => {
    const res = await h.post('/api/routes', {
      session,
      car_number: 'А001АА77',
      from_location: 'X',
      to_location: 'Y',
    });
    expect(res.body.error).toBe('CAR_BUSY');
  });

  it('GET /api/routes — admin sees all', async () => {
    const res = await h.get('/api/routes', { session });
    expect(res.body.status).toBe('ok');
    expect(res.body.routes.length).toBeGreaterThan(0);
  });

  it('GET /api/routes/active-cars', async () => {
    const res = await h.get('/api/routes/active-cars', { session });
    expect(res.body.status).toBe('ok');
    expect(res.body.active_car_numbers).toContain('А001АА77');
  });

  it('complete route', async () => {
    const list = await h.get('/api/routes', { session });
    const active = list.body.routes.find(r => r.status === 'active' && r.car_number === 'А001АА77');
    expect(active).toBeDefined();

    const complete = await h.post(`/api/routes/${active.id}/complete`, { session });
    expect(complete.body.status).toBe('ok');

    // Should no longer be active
    const list2 = await h.get('/api/routes', { session });
    const route = list2.body.routes.find(r => r.id === active.id);
    expect(route.status).toBe('completed');
  });

  it('complete non-existent route → NOT_FOUND', async () => {
    const res = await h.post('/api/routes/999999/complete', { session });
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('no session → auth error', async () => {
    const res = await h.post('/api/routes', { car_number: 'X', to_location: 'Y' });
    expect(['FORBIDDEN', 'SESSION_INVALID']).toContain(res.body.error);
  });

  it('GET /api/routes/board — admin', async () => {
    const res = await h.get('/api/routes/board', { session });
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.cars)).toBe(true);
    expect(Array.isArray(res.body.locations)).toBe(true);
  });
});
