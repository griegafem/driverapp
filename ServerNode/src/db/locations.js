import Database from 'better-sqlite3';
import path from 'path';

export function createLocationDb(dataRoot) {
  const db = new Database(path.join(dataRoot, 'locations.db'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    )
  `);

  const stmtAll = db.prepare('SELECT id,name,description FROM locations ORDER BY name');

  function mapRow(r) {
    return { id: r.id, name: r.name, description: r.description };
  }

  return {
    getAll() { return stmtAll.all().map(mapRow); },

    getById(id) {
      if (id <= 0) return null;
      const r = db.prepare('SELECT id,name,description FROM locations WHERE id=? LIMIT 1').get(id);
      return r ? mapRow(r) : null;
    },

    upsert(loc) {
      const name = (loc.name || '').trim();
      if (!name) return;
      const desc = (loc.description || '').trim();
      if (loc.id > 0) {
        const changed = db.prepare('UPDATE locations SET name=?,description=? WHERE id=?')
          .run(name, desc, loc.id).changes;
        if (changed > 0) return;
      }
      db.prepare('INSERT INTO locations (name,description) VALUES (?,?)').run(name, desc);
    },

    deleteById(id) {
      if (id <= 0) return false;
      return db.prepare('DELETE FROM locations WHERE id=?').run(id).changes > 0;
    },
  };
}
