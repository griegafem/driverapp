import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createTestApp, loginAdmin } from './helpers.js';

// Build a minimal multipart body by hand (single file field "doc").
function multipartBody(filename, mime, content) {
  const boundary = '----smoke' + Math.random().toString(16).slice(2);
  const pre = `--${boundary}\r\nContent-Disposition: form-data; name="doc"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`;
  const post = `\r\n--${boundary}--\r\n`;
  const payload = Buffer.concat([Buffer.from(pre), Buffer.from(content), Buffer.from(post)]);
  return { boundary, payload };
}

describe('decommission flow', () => {
  let h, session, app, carId, carNumber;

  beforeAll(async () => {
    h = await createTestApp();
    app = h.app;
    session = await loginAdmin(h);
    // create a car
    await h.post('/api/admin/cars/upsert', {
      session,
      car: { number: 'X111XX99', brand: 'Test', model: 'Decomm' },
    });
    const list = await h.get('/api/admin/cars', { session });
    const car = list.body.cars.find(c => c.number === 'X111XX99');
    carId = car.id;
    carNumber = car.number;
  });

  afterAll(async () => { await h.cleanup(); });

  it('car appears in public /api/cars before decommission', async () => {
    const res = await h.get('/api/cars');
    expect(res.body.cars.some(c => c.plateNumber === 'X111XX99')).toBe(true);
  });

  it('admin decommissions car with PDF doc', async () => {
    const { boundary, payload } = multipartBody('doc.pdf', 'application/pdf', '%PDF-1.4 fake');
    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/cars/decommission?session=${encodeURIComponent(session)}&id=${carId}&date=2026-07-07`,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.decommissioned_at).toBe('2026-07-07');
  });

  it('rejects a second decommission (irreversible)', async () => {
    const { boundary, payload } = multipartBody('doc.pdf', 'application/pdf', '%PDF-1.4 fake');
    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/cars/decommission?session=${encodeURIComponent(session)}&id=${carId}&date=2026-07-08`,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(res.json().error).toBe('ALREADY_DECOMMISSIONED');
  });

  it('rejects a non-pdf/non-image mime', async () => {
    await h.post('/api/admin/cars/upsert', { session, car: { number: 'Y222YY99', brand: 'T', model: 'T' } });
    const l = await h.get('/api/admin/cars', { session });
    const id = l.body.cars.find(c => c.number === 'Y222YY99').id;
    const { boundary, payload } = multipartBody('a.txt', 'text/plain', 'hello');
    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/cars/decommission?session=${encodeURIComponent(session)}&id=${id}&date=2026-07-07`,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(res.json().error).toBe('BAD_FILE_TYPE');
  });

  it('decommissioned car is excluded from public /api/cars', async () => {
    const res = await h.get('/api/cars');
    expect(res.body.cars.some(c => c.plateNumber === 'X111XX99')).toBe(false);
  });

  it('decommissioned car is excluded from /api/routes/board', async () => {
    const res = await h.get('/api/routes/board', { session });
    expect(res.body.cars.some(c => c.car_number === 'X111XX99')).toBe(false);
  });

  it('admin/cars still lists it with decommissioned_at + has_doc', async () => {
    const res = await h.get('/api/admin/cars', { session });
    const car = res.body.cars.find(c => c.number === 'X111XX99');
    expect(car).toBeTruthy();
    expect(car.decommissioned_at).toBe('2026-07-07');
    expect(car.has_doc).toBe(true);
  });

  it('car-card exposes decommission status + doc flag', async () => {
    const res = await h.get(`/api/car-card/${carNumber}`, { session });
    expect(res.body.car.decommissioned_at).toBe('2026-07-07');
    expect(res.body.car.has_decommission_doc).toBe(true);
  });

  it('car-doc download returns the PDF with attachment disposition', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/car-doc/${carNumber}?session=${encodeURIComponent(session)}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('download works for a cyrillic plate (non-ASCII Content-Disposition)', async () => {
    const num = 'Р222РР123';
    await h.post('/api/admin/cars/upsert', { session, car: { number: num, brand: 'VW', model: 'Tiguan' } });
    const l = await h.get('/api/admin/cars', { session });
    const id = l.body.cars.find(c => c.number === num.toUpperCase()).id;
    const { boundary, payload } = multipartBody('d.pdf', 'application/pdf', '%PDF-1.4 fake');
    await app.inject({
      method: 'POST',
      url: `/api/admin/cars/decommission?session=${encodeURIComponent(session)}&id=${id}&date=2026-07-07`,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    const res = await app.inject({
      method: 'GET',
      url: `/api/car-doc/${encodeURIComponent(num)}?session=${encodeURIComponent(session)}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain("filename*=UTF-8''");
  });
});
