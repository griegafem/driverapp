import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export function createCarDb(dataRoot) {
  const db = new Database(path.join(dataRoot, 'cars.db'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      vin TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL DEFAULT '',
      responsible TEXT NOT NULL DEFAULT '',
      current_location TEXT NOT NULL DEFAULT ''
    )
  `);

  for (const [col, def] of [
    ["current_location", "TEXT NOT NULL DEFAULT ''"],
    ["vehicle_type",     "TEXT NOT NULL DEFAULT ''"],
    ["visible_in_routes","INTEGER NOT NULL DEFAULT 1"],
    ["decommissioned_at","TEXT NOT NULL DEFAULT ''"],
    ["decommission_doc", "TEXT NOT NULL DEFAULT ''"],
  ]) {
    try { db.exec(`ALTER TABLE cars ADD COLUMN ${col} ${def}`); } catch {}
  }

  const countRow = db.prepare('SELECT COUNT(1) as n FROM cars').get().n;
  if (countRow === 0) {
    db.prepare('INSERT INTO cars (number,brand,model) VALUES (?,?,?)').run('А000АА00', 'Lada', 'Vesta');
  }

  _seedFromJson(db, path.join(dataRoot, 'seed', 'cars.json'));

  const stmtAll = db.prepare(
    'SELECT id,number,brand,model,color,vin,year,department,responsible,current_location,vehicle_type,visible_in_routes,decommissioned_at,decommission_doc FROM cars ORDER BY number'
  );
  const stmtByNum = db.prepare(
    'SELECT id,number,brand,model,color,vin,year,department,responsible,current_location,vehicle_type,visible_in_routes,decommissioned_at,decommission_doc FROM cars WHERE number=? LIMIT 1'
  );

  function mapRow(r) {
    return {
      id: r.id, number: r.number, brand: r.brand, model: r.model, color: r.color,
      vin: r.vin, year: r.year, department: r.department, responsible: r.responsible,
      currentLocation: r.current_location,
      vehicleType: r.vehicle_type || '',
      visibleInRoutes: r.visible_in_routes !== 0,
      decommissionedAt: r.decommissioned_at || '',
      decommissionDoc: r.decommission_doc || '',
    };
  }

  return {
    getAll() { return stmtAll.all().map(mapRow); },

    getByNumber(number) {
      const n = normalizeNumber(number);
      if (!n) return null;
      const r = stmtByNum.get(n);
      return r ? mapRow(r) : null;
    },

    count() {
      return db.prepare('SELECT COUNT(1) as n FROM cars').get().n;
    },

    upsert(c) {
      const number = normalizeNumber(c.number);
      if (!number) return;
      if (c.id > 0) {
        const changed = db.prepare(
          'UPDATE cars SET number=?,brand=?,model=?,color=?,vin=?,year=?,department=?,responsible=?,current_location=?,vehicle_type=? WHERE id=?'
        ).run(number, t(c.brand), t(c.model), t(c.color), t(c.vin), t(c.year), t(c.department), t(c.responsible), t(c.currentLocation), t(c.vehicleType), c.id).changes;
        if (changed > 0) return;
      }
      db.prepare(`
        INSERT INTO cars (number,brand,model,color,vin,year,department,responsible,current_location,vehicle_type)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(number) DO UPDATE SET
          brand=excluded.brand,model=excluded.model,color=excluded.color,
          vin=excluded.vin,year=excluded.year,department=excluded.department,
          responsible=excluded.responsible,current_location=excluded.current_location,
          vehicle_type=excluded.vehicle_type
      `).run(number, t(c.brand), t(c.model), t(c.color), t(c.vin), t(c.year), t(c.department), t(c.responsible), t(c.currentLocation || ''), t(c.vehicleType || ''));
    },

    toggleVisibility(id) {
      if (!id || id <= 0) return null;
      db.prepare('UPDATE cars SET visible_in_routes = CASE WHEN visible_in_routes=1 THEN 0 ELSE 1 END WHERE id=?').run(id);
      const r = db.prepare('SELECT visible_in_routes FROM cars WHERE id=?').get(id);
      return r ? r.visible_in_routes !== 0 : null;
    },

    decommission(id, dateStr, docExt) {
      if (!id || id <= 0) return false;
      const changed = db.prepare(
        "UPDATE cars SET decommissioned_at=?, decommission_doc=? WHERE id=? AND (decommissioned_at IS NULL OR decommissioned_at='')"
      ).run(t(dateStr), t(docExt), id).changes;
      return changed > 0;
    },

    updateLocation(carNumber, location) {
      const n = normalizeNumber(carNumber);
      if (!n) return;
      db.prepare('UPDATE cars SET current_location=? WHERE number=?').run(t(location), n);
    },

    deleteById(id) {
      if (id <= 0) return false;
      return db.prepare('DELETE FROM cars WHERE id=?').run(id).changes > 0;
    },
  };
}

function t(s) { return (s || '').trim(); }

export function normalizeNumber(number) {
  return (number || '').trim().toUpperCase();
}

function _seedFromJson(db, jsonPath) {
  try {
    if (!fs.existsSync(jsonPath)) return;
    const list = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!Array.isArray(list)) return;
    const stmt = db.prepare(`
      INSERT INTO cars (number,brand,model,color,vin,year,department,responsible,current_location,vehicle_type)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(number) DO UPDATE SET
        brand=excluded.brand,model=excluded.model,color=excluded.color,
        vin=excluded.vin,year=excluded.year,department=excluded.department,
        responsible=excluded.responsible,current_location=excluded.current_location,
        vehicle_type=excluded.vehicle_type
    `);
    for (const c of list) {
      if (!c?.number) continue;
      stmt.run(normalizeNumber(c.number), t(c.brand), t(c.model), t(c.color), t(c.vin),
               t(c.year), t(c.department), t(c.responsible), t(c.currentLocation || c.current_location || ''),
               t(c.vehicleType || c.vehicle_type || ''));
    }
  } catch { /* best-effort */ }
}
