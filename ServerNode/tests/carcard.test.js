import { describe, it, beforeAll, afterAll } from 'vitest';
import { expect } from 'vitest';
import { createTestApp, loginAdmin } from './helpers.js';

describe('car-card', () => {
  let h, session;
  beforeAll(async () => {
    h = await createTestApp();
    session = await loginAdmin(h);
    await h.post('/api/admin/cars/upsert', {
      session,
      car: { id: 0, number: 'К002КК99', brand: 'Hyundai', model: 'Solaris', vin: 'VIN001', year: '2021', department: 'Отдел 1', responsible: 'Иван', current_location: 'База' },
    });
  });
  afterAll(async () => { await h.cleanup(); });

  it('GET /api/car-card/:number — returns car info', async () => {
    const res = await h.get('/api/car-card/К002КК99', { session });
    expect(res.body.status).toBe('ok');
    expect(res.body.car.number).toBe('К002КК99');
    expect(res.body.car.brand).toBe('Hyundai');
    expect(res.body.car.has_photo).toBe(false);
  });

  it('GET /api/car-card/:number — not found', async () => {
    const res = await h.get('/api/car-card/НЕТУ00', { session });
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('GET /api/car-card/:number — no session → FORBIDDEN', async () => {
    const res = await h.get('/api/car-card/К002КК99');
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('GET /api/car-card/:number/routes — returns route history', async () => {
    const res = await h.get('/api/car-card/К002КК99/routes', { session });
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.routes)).toBe(true);
  });

  it('GET /api/car-photo/:number — 404 when no photo', async () => {
    const app = h.app;
    const res = await app.inject({ method: 'GET', url: '/api/car-photo/К002КК99' });
    expect(res.statusCode).toBe(404);
  });
});
