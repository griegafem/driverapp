import fs from 'fs';
import path from 'path';
import { requireAdmin, requireSession, errReply } from '../middleware/auth.js';

const DOC_EXT_BY_MIME = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};
const DOC_MIME_BY_EXT = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
};
const DOC_MAX_BYTES = 25 * 1024 * 1024;

export default async function carsRoutes(fastify, { carDb, routeDb, sessionDb, userDb, dataRoot }) {
  // Public car list for dropdown
  fastify.get('/api/cars', async (req, reply) => {
    try {
      const cars = carDb.getAll();
      const lastLocs = routeDb.getCarLastLocations();
      return reply.send({
        status: 'ok',
        cars: cars
          .filter(c => c.number && !c.decommissionedAt)
          .map(c => {
            const loc = lastLocs[String(c.id)] || c.currentLocation || '';
            return {
              plateNumber: c.number?.toUpperCase(),
              brand: c.brand || null,
              model: c.model || null,
              vin: c.vin || null,
              year: c.year || null,
              department: c.department || null,
              responsible: c.responsible || null,
              current_location: loc,
              visible_in_routes: c.visibleInRoutes !== false,
            };
          }),
      });
    } catch (e) {
      return reply.send({ status: 'error', error: 'CARS_READ_ERROR', message: e.message });
    }
  });

  // Admin: full car list
  fastify.get('/api/admin/cars', async (req, reply) => {
    try {
      requireAdmin(sessionDb, userDb, req.query.session);
    } catch (err) {
      return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN');
    }
    const cars = carDb.getAll();
    const lastLocs = routeDb.getCarLastLocations();
    return reply.send({
      status: 'ok',
      cars: cars.map(c => ({
        id: c.id,
        number: c.number || '',
        brand: c.brand || '',
        model: c.model || '',
        vin: c.vin || '',
        year: c.year || '',
        department: c.department || '',
        responsible: c.responsible || '',
        current_location: lastLocs[String(c.id)] || c.currentLocation || '',
        vehicle_type: c.vehicleType || '',
        visible_in_routes: c.visibleInRoutes !== false,
        decommissioned_at: c.decommissionedAt || '',
        has_doc: !!c.decommissionDoc,
      })),
    });
  });

  fastify.post('/api/admin/cars/upsert', async (req, reply) => {
    try {
      requireAdmin(sessionDb, userDb, (req.body || {}).session);
    } catch (err) {
      return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN');
    }
    const c = (req.body || {}).car || {};
    const number = (c.number || '').trim();
    if (!number) return reply.send({ status: 'error', error: 'BAD_DATA' });

    carDb.upsert({
      id: c.id || 0,
      number,
      brand: c.brand || '',
      model: c.model || '',
      color: '',
      vin: c.vin || '',
      year: c.year || '',
      department: c.department || '',
      responsible: c.responsible || '',
      currentLocation: c.current_location || '',
      vehicleType: c.vehicle_type || '',
    });
    return reply.send({ status: 'ok' });
  });

  fastify.post('/api/admin/cars/delete', async (req, reply) => {
    try {
      requireAdmin(sessionDb, userDb, (req.body || {}).session);
    } catch (err) {
      return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN');
    }
    const id = (req.body || {}).id;
    if (!id || id <= 0) return reply.send({ status: 'error', error: 'BAD_ID' });
    const deleted = carDb.deleteById(id);
    return reply.send({ status: 'ok', deleted });
  });

  fastify.post('/api/admin/cars/toggle-visibility', async (req, reply) => {
    try {
      requireAdmin(sessionDb, userDb, (req.body || {}).session);
    } catch (err) {
      return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN');
    }
    const id = (req.body || {}).id;
    if (!id || id <= 0) return reply.send({ status: 'error', error: 'BAD_ID' });
    const visible = carDb.toggleVisibility(id);
    if (visible === null) return reply.send({ status: 'error', error: 'NOT_FOUND' });
    return reply.send({ status: 'ok', visible_in_routes: visible });
  });

  // Admin: decommission a car (irreversible). Multipart file body + query params.
  fastify.post('/api/admin/cars/decommission', async (req, reply) => {
    try {
      requireAdmin(sessionDb, userDb, req.query.session);
    } catch (err) {
      return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN');
    }

    const id = Number(req.query.id) || 0;
    const date = (req.query.date || '').trim();
    if (id <= 0) return reply.send({ status: 'error', error: 'BAD_ID' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply.send({ status: 'error', error: 'BAD_DATE' });

    const car = carDb.getAll().find(c => c.id === id);
    if (!car) return reply.send({ status: 'error', error: 'NOT_FOUND' });
    if (car.decommissionedAt) return reply.send({ status: 'error', error: 'ALREADY_DECOMMISSIONED' });

    const data = await req.file({ limits: { fileSize: DOC_MAX_BYTES } });
    if (!data) return reply.send({ status: 'error', error: 'NO_FILE' });
    const ext = DOC_EXT_BY_MIME[data.mimetype];
    if (!ext) return reply.send({ status: 'error', error: 'BAD_FILE_TYPE' });

    const docDir = path.join(dataRoot, 'car-docs');
    fs.mkdirSync(docDir, { recursive: true });
    const docPath = path.join(docDir, (car.number || '').trim().toUpperCase() + '.' + ext);

    try {
      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(docPath);
        data.file.pipe(ws);
        data.file.on('limit', () => { ws.destroy(); reject(new Error('FILE_TOO_LARGE')); });
        ws.on('finish', resolve);
        ws.on('error', reject);
      });
    } catch (e) {
      try { fs.unlinkSync(docPath); } catch {}
      if (e.message === 'FILE_TOO_LARGE' || data.file.truncated) {
        return reply.send({ status: 'error', error: 'FILE_TOO_LARGE' });
      }
      return reply.send({ status: 'error', error: 'SAVE_FAILED' });
    }

    if (data.file.truncated) {
      try { fs.unlinkSync(docPath); } catch {}
      return reply.send({ status: 'error', error: 'FILE_TOO_LARGE' });
    }

    const ok = carDb.decommission(id, date, ext);
    if (!ok) {
      try { fs.unlinkSync(docPath); } catch {}
      return reply.send({ status: 'error', error: 'ALREADY_DECOMMISSIONED' });
    }
    return reply.send({ status: 'ok', decommissioned_at: date });
  });

  // Download decommission document (any authenticated user)
  fastify.get('/api/car-doc/:number', async (req, reply) => {
    try {
      requireSession(sessionDb, userDb, req.query.session);
    } catch (err) {
      return errReply(reply, err.statusCode || 401, err.error || 'FORBIDDEN');
    }
    const car = carDb.getByNumber(req.params.number);
    if (!car || !car.decommissionDoc) return reply.code(404).send();
    const ext = car.decommissionDoc;
    const docPath = path.join(dataRoot, 'car-docs', (car.number || '').trim().toUpperCase() + '.' + ext);
    if (!fs.existsSync(docPath)) return reply.code(404).send();
    const mime = DOC_MIME_BY_EXT[ext] || 'application/octet-stream';
    const plate = (car.number || 'doc').trim().toUpperCase();
    const asciiName = plate.replace(/[^\x20-\x7E]/g, '_') + '.' + ext;
    const utf8Name = encodeURIComponent(plate + '.' + ext);
    return reply
      .type(mime)
      .header('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`)
      .send(fs.createReadStream(docPath));
  });

  // Legacy endpoint — get car by number (no auth)
  fastify.post('/api/get-car', async (req, reply) => {
    const { number } = req.body || {};
    if (!number) return reply.send({ status: 'error', error: 'CAR_NOT_FOUND' });
    const car = carDb.getByNumber(number);
    if (!car) return reply.send({ status: 'error', error: 'CAR_NOT_FOUND' });
    return reply.send({ status: 'ok', brand: car.brand, model: car.model });
  });
}
