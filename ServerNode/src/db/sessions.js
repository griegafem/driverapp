import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function createSessionDb(dataRoot) {
  const db = new Database(path.join(dataRoot, 'sessions.db'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      login TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  const stmtGet = db.prepare('SELECT login, created_at FROM sessions WHERE token = ?');
  const stmtInsert = db.prepare('INSERT OR REPLACE INTO sessions (token, login, created_at) VALUES (?, ?, ?)');
  const stmtDelete = db.prepare('DELETE FROM sessions WHERE token = ?');
  const stmtCleanup = db.prepare('DELETE FROM sessions WHERE created_at < ?');

  return {
    create(login) {
      const token = crypto.randomBytes(48).toString('base64url');
      stmtInsert.run(token, login, new Date().toISOString());
      // Occasional cleanup (1% chance per create)
      if (Math.random() < 0.01) {
        stmtCleanup.run(new Date(Date.now() - TTL_MS).toISOString());
      }
      return token;
    },
    getLogin(token) {
      if (!token) return null;
      const row = stmtGet.get(token);
      if (!row) return null;
      if (Date.now() - new Date(row.created_at).getTime() > TTL_MS) {
        stmtDelete.run(token);
        return null;
      }
      return row.login;
    },
    remove(token) {
      if (token) stmtDelete.run(token);
    },
  };
}
