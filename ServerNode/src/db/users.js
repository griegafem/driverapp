import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export function createUserDb(dataRoot) {
  const db = new Database(path.join(dataRoot, 'users.db'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      surname TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      patronymic TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT ''
    )
  `);

  const count = db.prepare('SELECT COUNT(1) as n FROM users').get().n;
  if (count === 0) {
    db.prepare('INSERT INTO users (login, password, role, surname, name) VALUES (?, ?, ?, ?, ?)')
      .run('admin', '1', 'admin', 'Admin', 'Admin');
  }

  _seedFromJson(db, path.join(dataRoot, 'seed', 'users.json'));

  const stmtByLogin = db.prepare(
    'SELECT id, login, password, role, surname, name, patronymic, phone FROM users WHERE login = ? LIMIT 1'
  );
  const stmtAll = db.prepare(
    'SELECT id, login, password, role, surname, name, patronymic, phone FROM users ORDER BY surname, name, patronymic, login'
  );

  function mapRow(r) {
    return { id: r.id, login: r.login, password: r.password, role: r.role,
             surname: r.surname, name: r.name, patronymic: r.patronymic, phone: r.phone };
  }

  return {
    getByLogin(login) {
      if (!login) return null;
      const r = stmtByLogin.get(login.trim());
      return r ? mapRow(r) : null;
    },

    getAll() {
      return stmtAll.all().map(mapRow);
    },

    async verifyPassword(user, password) {
      const stored = user.password;
      if (stored.startsWith('$2')) {
        return bcrypt.compare(password, stored);
      }
      if (stored !== password) return false;
      // Migrate plain text → bcrypt
      try {
        const hash = await bcrypt.hash(password, 10);
        db.prepare('UPDATE users SET password = ? WHERE login = ?').run(hash, user.login);
      } catch { /* non-critical */ }
      return true;
    },

    upsert(u) {
      const login = (u.login || '').trim();
      const password = (u.password || '').trim();
      if (!login || !password) return;
      if (u.id > 0) {
        const changed = db.prepare(
          'UPDATE users SET login=?,password=?,role=?,surname=?,name=?,patronymic=?,phone=? WHERE id=?'
        ).run(login, password, normalizeRole(u.role), t(u.surname), t(u.name), t(u.patronymic), t(u.phone), u.id).changes;
        if (changed > 0) return;
      }
      db.prepare(`
        INSERT INTO users (login,password,role,surname,name,patronymic,phone)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(login) DO UPDATE SET
          password=excluded.password,role=excluded.role,
          surname=excluded.surname,name=excluded.name,
          patronymic=excluded.patronymic,phone=excluded.phone
      `).run(login, password, normalizeRole(u.role), t(u.surname), t(u.name), t(u.patronymic), t(u.phone));
    },

    deleteById(id) {
      if (id <= 0) return false;
      return db.prepare('DELETE FROM users WHERE id=?').run(id).changes > 0;
    },
  };
}

function t(s) { return (s || '').trim(); }

export function normalizeRole(role) {
  const r = (role || '').trim().toLowerCase();
  if (r === 'admin' || r === 'owner') return r;
  if (r === 'driver') return 'driver';
  return 'user';
}

export function isAdminRole(role) {
  const r = (role || '').trim().toLowerCase();
  return r === 'admin' || r === 'owner';
}

function _seedFromJson(db, jsonPath) {
  try {
    if (!fs.existsSync(jsonPath)) return;
    const list = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!Array.isArray(list)) return;
    const stmt = db.prepare(`
      INSERT INTO users (login,password,role,surname,name,patronymic,phone)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(login) DO UPDATE SET
        password=excluded.password,role=excluded.role,
        surname=excluded.surname,name=excluded.name,
        patronymic=excluded.patronymic,phone=excluded.phone
    `);
    for (const u of list) {
      if (!u?.login || !u?.password) continue;
      stmt.run(u.login.trim(), u.password.trim(), normalizeRole(u.role),
               t(u.surname), t(u.name), t(u.patronymic), t(u.phone));
    }
  } catch { /* best-effort */ }
}
