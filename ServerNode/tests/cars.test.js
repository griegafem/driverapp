import { describe, it, beforeAll, afterAll } from 'vitest';
import { expect } from 'vitest';
import { createTestApp, loginAdmin } from './helpers.js';

describe('cars', () => {
  let h, session;
  beforeAll(async () => {
    h = await createTestApp();
    session = await loginAdmin(h);
  });
  afterAll(async () => { await h.cleanup(); });

  it('GET /api/cars — public list', async () => {
    const res = await h.get('/api/cars');
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.cars)).toBe(true);
  });

  it('GET /api/admin/cars — requires admin', async () => {
    const res = await h.get('/api/admin/cars', { session });
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.cars)).toBe(true);
  });

  it('GET /api/admin/cars — no session → forbidden', async () => {
    const res = await h.get('/api/admin/cars');
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('upsert and delete car', async () => {
    const upsertRes = await h.post('/api/admin/cars/upsert', {
      session,
      car: { id: 0, number: 'Т123ЕС77', brand: 'Toyota', model: 'Camry', vin: 'TEST1', year: '2022', department: '', responsible: '', current_location: '' },
    });
    expect(upsertRes.body.status).toBe('ok');

    // Verify car appears in list
    const listRes = await h.get('/api/admin/cars', { session });
    const car = listRes.body.cars.find(c => c.number === 'Т123ЕС77');
    expect(car).toBeDefined();
    expect(car.brand).toBe('Toyota');

    // Delete
    const delRes = await h.post('/api/admin/cars/delete', { session, id: car.id });
    expect(delRes.body.status).toBe('ok');
    expect(delRes.body.deleted).toBe(true);
  });

  it('upsert without number → BAD_DATA', async () => {
    const res = await h.post('/api/admin/cars/upsert', { session, car: { brand: 'Audi' } });
    expect(res.body.error).toBe('BAD_DATA');
  });
});
