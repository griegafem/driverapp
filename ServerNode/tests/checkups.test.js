import { describe, it, beforeAll, afterAll } from 'vitest';
import { expect } from 'vitest';
import { createTestApp, loginAdmin } from './helpers.js';

// Tiny 1x1 red pixel JPEG (base64)
const TINY_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB//EAB4QAAEEAgMBAAAAAAAAAAAAAAEAAgMEESExUf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABrWgAAD/9k=';

describe('checkups', () => {
  let h, session;
  beforeAll(async () => {
    h = await createTestApp();
    session = await loginAdmin(h);
    // Seed a car
    await h.post('/api/admin/cars/upsert', {
      session,
      car: { id: 0, number: 'Т001ЕС77', brand: 'Kia', model: 'Rio', vin: '', year: '', department: '', responsible: '', current_location: '' },
    });
  });
  afterAll(async () => { await h.cleanup(); });

  it('submit pre-checkup without photos', async () => {
    const res = await h.post('/api/pre-checkup', {
      session,
      data: {
        number: 'Т001ЕС77',
        date: '2026-07-03',
        mileage: '55000',
        geo: '55.123,37.456',
        fuel_level: '75%',
        oil_level: 'норма',
      },
    });
    expect(res.body.status).toBe('ok');
  });

  it('submit pre-checkup with photo', async () => {
    const res = await h.post('/api/pre-checkup', {
      session,
      data: {
        number: 'Т001ЕС77',
        date: '2026-07-03',
        mileage: '55001',
        photo_rl: TINY_JPEG,
      },
    });
    expect(res.body.status).toBe('ok');
  });

  it('submit post-checkup', async () => {
    const res = await h.post('/api/post-checkup', {
      session,
      data: {
        number: 'Т001ЕС77',
        date: '2026-07-03',
        mileage: '55100',
        geo: '55.234,37.567',
        fuel_level: '50%',
      },
    });
    expect(res.body.status).toBe('ok');
  });

  it('pre-checkup without session → SESSION_INVALID', async () => {
    const res = await h.post('/api/pre-checkup', {
      session: 'bad-token',
      data: { number: 'Т001ЕС77', mileage: '1000' },
    });
    expect(res.body.error).toBe('SESSION_INVALID');
  });

  it('GET /api/get-photo with invalid id → 404', async () => {
    const app = h.app;
    const res = await app.inject({ method: 'GET', url: '/api/get-photo?id=invalid123' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/get-photo path traversal attempt → 400 or 404', async () => {
    // Encode a traversal path in base36-ish way — the key would fail to decode or fall outside dataRoot
    const app = h.app;
    const res = await app.inject({ method: 'GET', url: '/api/get-photo?id=../../../etc/passwd' });
    expect([400, 403, 404]).toContain(res.statusCode);
  });
});
