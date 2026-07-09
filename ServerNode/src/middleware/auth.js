import { isAdminRole } from '../db/users.js';

export function getSessionUser(sessionDb, userDb, sessionToken) {
  if (!sessionToken) return null;
  const login = sessionDb.getLogin(sessionToken);
  if (!login) return null;
  return userDb.getByLogin(login);
}

export function requireSession(sessionDb, userDb, sessionToken) {
  const user = getSessionUser(sessionDb, userDb, sessionToken);
  if (!user) throw { statusCode: 401, error: 'SESSION_INVALID' };
  return user;
}

export function requireAdmin(sessionDb, userDb, sessionToken) {
  if (!sessionToken) throw { statusCode: 403, error: 'FORBIDDEN' };
  const login = sessionDb.getLogin(sessionToken);
  if (!login) throw { statusCode: 403, error: 'FORBIDDEN' };
  const user = userDb.getByLogin(login);
  if (!user) throw { statusCode: 403, error: 'FORBIDDEN' };
  if (!isAdminRole(user.role)) throw { statusCode: 403, error: 'FORBIDDEN' };
  return user;
}

export function errReply(reply, statusCode, error) {
  return reply.code(statusCode).send({ status: 'error', error });
}
