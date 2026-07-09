import { requireAdmin, errReply } from '../middleware/auth.js';

export default async function locationRoutes(fastify, { locationDb, sessionDb, userDb }) {
  fastify.get('/api/locations', async (req, reply) => {
    try {
      const locs = locationDb.getAll().map(l => ({ id: l.id, name: l.name, description: l.description }));
      return reply.send({ status: 'ok', locations: locs });
    } catch (e) {
      return reply.send({ status: 'error', error: e.message });
    }
  });

  fastify.get('/api/admin/locations', async (req, reply) => {
    try { requireAdmin(sessionDb, userDb, req.query.session); }
    catch (err) { return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN'); }
    const locs = locationDb.getAll().map(l => ({ id: l.id, name: l.name, description: l.description }));
    return reply.send({ status: 'ok', locations: locs });
  });

  fastify.post('/api/admin/locations/upsert', async (req, reply) => {
    try { requireAdmin(sessionDb, userDb, (req.body || {}).session); }
    catch (err) { return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN'); }
    const loc = (req.body || {}).location || {};
    const name = (loc.name || '').trim();
    if (!name) return reply.send({ status: 'error', error: 'BAD_DATA' });
    locationDb.upsert({ id: loc.id || 0, name, description: loc.description || '' });
    return reply.send({ status: 'ok' });
  });

  fastify.post('/api/admin/locations/delete', async (req, reply) => {
    try { requireAdmin(sessionDb, userDb, (req.body || {}).session); }
    catch (err) { return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN'); }
    const id = (req.body || {}).id;
    if (!id || id <= 0) return reply.send({ status: 'error', error: 'BAD_ID' });
    const deleted = locationDb.deleteById(id);
    return reply.send({ status: 'ok', deleted });
  });
}
