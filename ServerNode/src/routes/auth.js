import { isAdminRole } from '../db/users.js';
import { createAccessKey } from '../utils/accessKeys.js';

function authPayload(user, sessionToken) {
  return {
    status: 'ok',
    name: user.name,
    surname: user.surname,
    role: (user.role || '').toLowerCase(),
    access_key: isAdminRole(user.role) ? createAccessKey() : '',
    session: sessionToken,
    random_wheel: '',
    photoday: '',
  };
}

export default async function authRoutes(fastify, { userDb, sessionDb }) {
  fastify.post('/api/login', async (req, reply) => {
    const { login, password } = req.body || {};
    const user = userDb.getByLogin(login || '');
    if (!user) return reply.send({ status: 'error', error: 'USER_NOT_FOUND' });

    const ok = await userDb.verifyPassword(user, password || '');
    if (!ok) return reply.send({ status: 'error', error: 'WRONG_DATA' });

    const token = sessionDb.create(user.login);
    return reply.send(authPayload(user, token));
  });

  fastify.post('/api/authorize', async (req, reply) => {
    const { session } = req.body || {};
    if (!session) return reply.send({ status: 'error', error: 'SESSION_INVALID' });

    const login = sessionDb.getLogin(session);
    const user = login ? userDb.getByLogin(login) : null;
    if (!user) return reply.send({ status: 'error', error: 'USER_NOT_FOUND' });

    return reply.send(authPayload(user, session));
  });
}
