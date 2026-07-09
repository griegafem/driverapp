import { requireAdmin, errReply } from '../middleware/auth.js';
import { normalizeRole } from '../db/users.js';

export default async function userRoutes(fastify, { userDb, sessionDb }) {
  fastify.get('/api/users', async (req, reply) => {
    try { requireAdmin(sessionDb, userDb, req.query.session); }
    catch (err) { return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN'); }

    const users = userDb.getAll().map(u => ({
      id: u.id,
      surname: u.surname || '',
      name: u.name || '',
      patronymic: u.patronymic || '',
      phone: u.phone || '',
      role: (u.role || '').toLowerCase(),
      login: u.login || '',
      password: u.password || '',
    }));
    return reply.send({ status: 'ok', users });
  });

  fastify.post('/api/users/upsert', async (req, reply) => {
    try { requireAdmin(sessionDb, userDb, (req.body || {}).session); }
    catch (err) { return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN'); }

    const u = (req.body || {}).user || {};
    const login = (u.login || '').trim();
    const password = (u.password || '').trim();
    if (!login || !password) return reply.send({ status: 'error', error: 'BAD_DATA' });

    userDb.upsert({
      id: u.id || 0,
      login,
      password,
      role: normalizeRole(u.role),
      surname: u.surname || '',
      name: u.name || '',
      patronymic: u.patronymic || '',
      phone: u.phone || '',
    });
    return reply.send({ status: 'ok' });
  });

  fastify.post('/api/users/delete', async (req, reply) => {
    try { requireAdmin(sessionDb, userDb, (req.body || {}).session); }
    catch (err) { return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN'); }

    const id = (req.body || {}).id;
    if (!id || id <= 0) return reply.send({ status: 'error', error: 'BAD_ID' });
    const deleted = userDb.deleteById(id);
    return reply.send({ status: 'ok', deleted });
  });
}
