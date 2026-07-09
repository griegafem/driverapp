import Database from 'better-sqlite3';
import path from 'path';

export function createRouteDb(dataRoot) {
  const db = new Database(path.join(dataRoot, 'routes.db'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at       TEXT    NOT NULL,
      car_id           TEXT    NOT NULL,
      car_number       TEXT    NOT NULL DEFAULT '',
      car_brand        TEXT    NOT NULL DEFAULT '',
      car_model        TEXT    NOT NULL DEFAULT '',
      driver_login     TEXT    NOT NULL,
      driver_name      TEXT    NOT NULL DEFAULT '',
      driver_surname   TEXT    NOT NULL DEFAULT '',
      from_location    TEXT    NOT NULL DEFAULT '',
      to_location      TEXT    NOT NULL DEFAULT '',
      status           TEXT    NOT NULL DEFAULT 'active',
      pre_checkup_id   INTEGER,
      post_checkup_id  INTEGER,
      departed_at      TEXT,
      arrived_at       TEXT
    )
  `);

  function mapRow(r) {
    return {
      id: r.id,
      createdAt: r.created_at,
      carId: r.car_id,
      carNumber: r.car_number,
      carBrand: r.car_brand,
      carModel: r.car_model,
      driverLogin: r.driver_login,
      driverName: r.driver_name,
      driverSurname: r.driver_surname,
      fromLocation: r.from_location,
      toLocation: r.to_location,
      status: r.status,
      preCheckupId: r.pre_checkup_id ?? null,
      postCheckupId: r.post_checkup_id ?? null,
      departedAt: r.departed_at ?? null,
      arrivedAt: r.arrived_at ?? null,
    };
  }

  return {
    insert(r) {
      const result = db.prepare(`
        INSERT INTO routes
          (created_at,car_id,car_number,car_brand,car_model,
           driver_login,driver_name,driver_surname,
           from_location,to_location,status,departed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,'active',?)
      `).run(r.createdAt, r.carId, r.carNumber, r.carBrand, r.carModel,
             r.driverLogin, r.driverName, r.driverSurname,
             r.fromLocation, r.toLocation, r.departedAt ?? null);
      return result.lastInsertRowid;
    },

    getById(id) {
      const r = db.prepare('SELECT * FROM routes WHERE id=? LIMIT 1').get(id);
      return r ? mapRow(r) : null;
    },

    getActiveByCarId(carId) {
      const r = db.prepare("SELECT * FROM routes WHERE car_id=? AND status='active' LIMIT 1").get(carId);
      return r ? mapRow(r) : null;
    },

    getByDriver(login) {
      return db.prepare('SELECT * FROM routes WHERE driver_login=? ORDER BY id DESC').all(login).map(mapRow);
    },

    getAll() {
      return db.prepare('SELECT * FROM routes ORDER BY id DESC').all().map(mapRow);
    },

    complete(id, arrivedAt) {
      return db.prepare("UPDATE routes SET status='completed',arrived_at=? WHERE id=? AND status='active'")
        .run(arrivedAt, id).changes > 0;
    },

    setPreCheckup(routeId, checkupId) {
      return db.prepare('UPDATE routes SET pre_checkup_id=? WHERE id=?').run(checkupId, routeId).changes > 0;
    },

    setPostCheckup(routeId, checkupId) {
      return db.prepare('UPDATE routes SET post_checkup_id=? WHERE id=?').run(checkupId, routeId).changes > 0;
    },

    getCarLastLocations() {
      const rows = db.prepare(`
        SELECT car_id, to_location FROM routes
        WHERE status='completed'
          AND id IN (SELECT MAX(id) FROM routes WHERE status='completed' GROUP BY car_id)
      `).all();
      const dict = {};
      for (const r of rows) dict[r.car_id] = r.to_location;
      return dict;
    },
  };
}
