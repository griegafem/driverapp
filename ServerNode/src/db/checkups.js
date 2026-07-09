import Database from 'better-sqlite3';
import path from 'path';

export function createCheckupDb(dataRoot) {
  const db = new Database(path.join(dataRoot, 'checkups.db'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS post_mileage (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      submitted_at    TEXT    NOT NULL,
      car_number      TEXT,
      car_id          TEXT,
      mileage         TEXT,
      user_login      TEXT,
      user_name       TEXT,
      user_surname    TEXT,
      car_brand       TEXT,
      car_model       TEXT,
      car_type        TEXT,
      geo             TEXT,
      oil_level       TEXT,
      coolant_ok      INTEGER,
      brake_fluid     TEXT,
      washer_ok       INTEGER,
      fuel_level      TEXT,
      clean_ok        INTEGER,
      interior_ok     INTEGER,
      wifi            TEXT,
      vpn             TEXT,
      location_name   TEXT,
      additional_info TEXT,
      critical_info   TEXT,
      photo_mileage   TEXT,
      photo_rl        TEXT,
      photo_rr        TEXT,
      photo_br        TEXT,
      photo_bl        TEXT,
      photo_front     TEXT,
      photo_rear      TEXT,
      photo_left      TEXT,
      photo_right     TEXT,
      photo_irl       TEXT,
      photo_irr       TEXT,
      photo_ibr       TEXT,
      photo_ibl       TEXT,
      photo_of_day       TEXT,
      photo_damage       TEXT,
      lighting_ok        INTEGER,
      emergency_kit_ok   INTEGER,
      glass_condition    TEXT,
      dashboard_errors   INTEGER,
      photo_dashboard    TEXT,
      photo_charger      TEXT,
      registration_ok    INTEGER,
      osago_date         TEXT,
      osago_missing      INTEGER
    );
    CREATE TABLE IF NOT EXISTS pre_checkups (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      submitted_at     TEXT    NOT NULL,
      user_login       TEXT,
      user_name        TEXT,
      user_surname     TEXT,
      car_id           TEXT,
      car_number       TEXT,
      car_brand        TEXT,
      car_model        TEXT,
      geo              TEXT,
      body_condition   TEXT,
      wheels_ok        INTEGER,
      wheel_damaged    INTEGER,
      interior_condition TEXT,
      oil_checked      INTEGER,
      oil_level        TEXT,
      coolant_ok       INTEGER,
      brake_fluid      TEXT,
      washer_ok        INTEGER,
      lighting_ok      INTEGER,
      emergency_kit_ok INTEGER,
      glass_condition  TEXT,
      mileage          TEXT,
      fuel_level       TEXT,
      dashboard_errors INTEGER,
      registration_ok  INTEGER,
      osago_date       TEXT,
      osago_missing    INTEGER,
      wifi             TEXT,
      vpn              TEXT,
      additional_info  TEXT,
      critical_info    TEXT,
      quick_exit       INTEGER,
      photo_mileage    TEXT,
      photo_rl         TEXT,
      photo_rr         TEXT,
      photo_br         TEXT,
      photo_bl         TEXT,
      photo_front      TEXT,
      photo_rear       TEXT,
      photo_left       TEXT,
      photo_right      TEXT,
      photo_irl        TEXT,
      photo_irr        TEXT,
      photo_ibr        TEXT,
      photo_ibl        TEXT,
      photo_of_day        TEXT,
      photo_dashboard     TEXT,
      photo_wheel_ok      TEXT,
      photo_wheel_damaged TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tech_inspections (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      submitted_at     TEXT    NOT NULL,
      car_number       TEXT,
      car_brand        TEXT,
      car_model        TEXT,
      user_login       TEXT,
      user_name        TEXT,
      user_surname     TEXT,
      geo              TEXT,
      photo_rl         TEXT,
      photo_rr         TEXT,
      photo_br         TEXT,
      photo_bl         TEXT,
      photo_front      TEXT,
      photo_rear       TEXT,
      photo_left       TEXT,
      photo_right      TEXT,
      photo_wfl        TEXT,
      photo_wfl_t      TEXT,
      photo_wfr        TEXT,
      photo_wfr_t      TEXT,
      photo_wrl        TEXT,
      photo_wrl_t      TEXT,
      photo_wrr        TEXT,
      photo_wrr_t      TEXT,
      wheels_ok        INTEGER,
      photo_irl        TEXT,
      photo_irr        TEXT,
      photo_ibr        TEXT,
      photo_ibl        TEXT,
      photo_engine     TEXT,
      photo_trunk      TEXT,
      additional_info  TEXT
    )
  `);

  for (const col of ['photo_wheel_ok', 'photo_wheel_damaged']) {
    try { db.exec(`ALTER TABLE pre_checkups ADD COLUMN ${col} TEXT`); } catch {}
  }
  try { db.exec("ALTER TABLE pre_checkups ADD COLUMN car_type TEXT"); } catch {}
  try { db.exec("ALTER TABLE tech_inspections ADD COLUMN car_type TEXT"); } catch {}

  for (const [col, type] of [
    ['user_login','TEXT'],['user_name','TEXT'],['user_surname','TEXT'],
    ['car_brand','TEXT'],['car_model','TEXT'],['car_type','TEXT'],
    ['geo','TEXT'],['oil_level','TEXT'],['coolant_ok','INTEGER'],
    ['brake_fluid','TEXT'],['washer_ok','INTEGER'],['fuel_level','TEXT'],
    ['clean_ok','INTEGER'],['interior_ok','INTEGER'],
    ['wifi','TEXT'],['vpn','TEXT'],['location_name','TEXT'],
    ['additional_info','TEXT'],['critical_info','TEXT'],
    ['photo_mileage','TEXT'],['photo_rl','TEXT'],['photo_rr','TEXT'],
    ['photo_br','TEXT'],['photo_bl','TEXT'],['photo_front','TEXT'],
    ['photo_rear','TEXT'],['photo_left','TEXT'],['photo_right','TEXT'],
    ['photo_irl','TEXT'],['photo_irr','TEXT'],['photo_ibr','TEXT'],
    ['photo_ibl','TEXT'],['photo_of_day','TEXT'],['photo_damage','TEXT'],
    ['lighting_ok','INTEGER'],['emergency_kit_ok','INTEGER'],
    ['glass_condition','TEXT'],['dashboard_errors','INTEGER'],
    ['photo_dashboard','TEXT'],['photo_charger','TEXT'],
    ['registration_ok','INTEGER'],['osago_date','TEXT'],['osago_missing','INTEGER'],
  ]) {
    try { db.exec(`ALTER TABLE post_mileage ADD COLUMN ${col} ${type}`); } catch {}
  }

  function boolToInt(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const s = String(v).toLowerCase();
    if (s === 'true' || s === '1') return 1;
    if (s === 'false' || s === '0') return 0;
    return null;
  }

  return {
    insertPreCheckup(r) {
      const result = db.prepare(`
        INSERT INTO pre_checkups (
          submitted_at,user_login,user_name,user_surname,
          car_id,car_number,car_brand,car_model,car_type,
          geo,body_condition,wheels_ok,wheel_damaged,
          interior_condition,oil_checked,oil_level,coolant_ok,
          brake_fluid,washer_ok,lighting_ok,emergency_kit_ok,
          glass_condition,mileage,fuel_level,dashboard_errors,
          registration_ok,osago_date,osago_missing,wifi,vpn,
          additional_info,critical_info,quick_exit,
          photo_mileage,photo_rl,photo_rr,photo_br,photo_bl,
          photo_front,photo_rear,photo_left,photo_right,
          photo_irl,photo_irr,photo_ibr,photo_ibl,photo_of_day,photo_dashboard,
          photo_wheel_ok,photo_wheel_damaged
        ) VALUES (
          ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        )
      `).run(
        r.submittedAt, r.userLogin ?? null, r.userName ?? null, r.userSurname ?? null,
        r.carId ?? null, r.carNumber ?? null, r.carBrand ?? null, r.carModel ?? null, r.carType ?? null,
        r.geo ?? null, r.bodyCondition ?? null, boolToInt(r.wheelsOk), boolToInt(r.wheelDamaged),
        r.interiorCondition ?? null, boolToInt(r.oilChecked), r.oilLevel ?? null, boolToInt(r.coolantOk),
        r.brakeFluid ?? null, boolToInt(r.washerOk), boolToInt(r.lightingOk), boolToInt(r.emergencyKitOk),
        r.glassCondition ?? null, r.mileage ?? null, r.fuelLevel ?? null, boolToInt(r.dashboardErrors),
        boolToInt(r.registrationOk), r.osagoDate ?? null, boolToInt(r.osagoMissing), r.wifi ?? null, r.vpn ?? null,
        r.additionalInfo ?? null, r.criticalInfo ?? null, boolToInt(r.quickExit),
        r.photoMileage ?? null, r.photoRl ?? null, r.photoRr ?? null, r.photoBr ?? null, r.photoBl ?? null,
        r.photoFront ?? null, r.photoRear ?? null, r.photoLeft ?? null, r.photoRight ?? null,
        r.photoIrl ?? null, r.photoIrr ?? null, r.photoIbr ?? null, r.photoIbl ?? null,
        r.photoOfDay ?? null, r.photoDashboard ?? null,
        r.photoWheelOk ?? null, r.photoWheelDamaged ?? null
      );
      return result.lastInsertRowid;
    },

    insertPostCheckup(r) {
      if (!r.mileage && !r.carNumber) return 0;
      const result = db.prepare(`
        INSERT INTO post_mileage (
          submitted_at,car_number,car_id,mileage,
          user_login,user_name,user_surname,car_brand,car_model,car_type,geo,
          oil_level,coolant_ok,brake_fluid,washer_ok,fuel_level,
          clean_ok,interior_ok,wifi,vpn,location_name,additional_info,critical_info,
          photo_mileage,photo_rl,photo_rr,photo_br,photo_bl,
          photo_front,photo_rear,photo_left,photo_right,
          photo_irl,photo_irr,photo_ibr,photo_ibl,photo_of_day,photo_damage,
          lighting_ok,emergency_kit_ok,glass_condition,dashboard_errors,
          photo_dashboard,photo_charger,registration_ok,osago_date,osago_missing
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        r.submittedAt, r.carNumber ?? null, r.carId ?? null, r.mileage ?? null,
        r.userLogin ?? null, r.userName ?? null, r.userSurname ?? null,
        r.carBrand ?? null, r.carModel ?? null, r.carType ?? null, r.geo ?? null,
        r.oilLevel ?? null, boolToInt(r.coolantOk), r.brakeFluid ?? null,
        boolToInt(r.washerOk), r.fuelLevel ?? null,
        boolToInt(r.cleanOk), boolToInt(r.interiorOk),
        r.wifi ?? null, r.vpn ?? null, r.locationName ?? null,
        r.additionalInfo ?? null, r.criticalInfo ?? null,
        r.photoMileage ?? null, r.photoRl ?? null, r.photoRr ?? null,
        r.photoBr ?? null, r.photoBl ?? null, r.photoFront ?? null,
        r.photoRear ?? null, r.photoLeft ?? null, r.photoRight ?? null,
        r.photoIrl ?? null, r.photoIrr ?? null, r.photoIbr ?? null,
        r.photoIbl ?? null, r.photoOfDay ?? null, r.photoDamage ?? null,
        boolToInt(r.lightingOk), boolToInt(r.emergencyKitOk),
        r.glassCondition ?? null, boolToInt(r.dashboardErrors),
        r.photoDashboard ?? null, r.photoCharger ?? null,
        boolToInt(r.registrationOk), r.osagoDate ?? null, boolToInt(r.osagoMissing)
      );
      return result.lastInsertRowid;
    },

    getAllPreCheckups() {
      return db.prepare('SELECT * FROM pre_checkups ORDER BY id DESC').all();
    },

    getAllPostCheckups() {
      return db.prepare('SELECT * FROM post_mileage ORDER BY id DESC').all();
    },

    insertTechInspection(r) {
      const result = db.prepare(`
        INSERT INTO tech_inspections (
          submitted_at, car_number, car_brand, car_model, car_type,
          user_login, user_name, user_surname, geo,
          photo_rl, photo_rr, photo_br, photo_bl,
          photo_front, photo_rear, photo_left, photo_right,
          photo_wfl, photo_wfl_t, photo_wfr, photo_wfr_t,
          photo_wrl, photo_wrl_t, photo_wrr, photo_wrr_t,
          wheels_ok,
          photo_irl, photo_irr, photo_ibr, photo_ibl,
          photo_engine, photo_trunk, additional_info
        ) VALUES (
          ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        )
      `).run(
        r.submittedAt, r.carNumber ?? null, r.carBrand ?? null, r.carModel ?? null, r.carType ?? null,
        r.userLogin ?? null, r.userName ?? null, r.userSurname ?? null, r.geo ?? null,
        r.photoRl ?? null, r.photoRr ?? null, r.photoBr ?? null, r.photoBl ?? null,
        r.photoFront ?? null, r.photoRear ?? null, r.photoLeft ?? null, r.photoRight ?? null,
        r.photoWfl ?? null, r.photoWflT ?? null, r.photoWfr ?? null, r.photoWfrT ?? null,
        r.photoWrl ?? null, r.photoWrlT ?? null, r.photoWrr ?? null, r.photoWrrT ?? null,
        boolToInt(r.wheelsOk),
        r.photoIrl ?? null, r.photoIrr ?? null, r.photoIbr ?? null, r.photoIbl ?? null,
        r.photoEngine ?? null, r.photoTrunk ?? null, r.additionalInfo ?? null
      );
      return result.lastInsertRowid;
    },

    getAllTechInspections() {
      return db.prepare('SELECT * FROM tech_inspections ORDER BY id DESC').all();
    },

    getLastMileageByCarNumber(carNumber, carId) {
      const n = (carNumber || '').trim().toUpperCase();
      const cid = carId && carId > 0 ? String(carId) : null;

      let sql;
      const params = [n];
      if (cid) {
        sql = `
          SELECT mileage, submitted_at FROM (
            SELECT mileage, submitted_at, id FROM pre_checkups
            WHERE (UPPER(car_number)=? OR car_id=?) AND mileage IS NOT NULL AND mileage!=''
            UNION ALL
            SELECT mileage, submitted_at, id FROM post_mileage
            WHERE (UPPER(car_number)=? OR car_id=?) AND mileage IS NOT NULL AND mileage!=''
          )
          ORDER BY submitted_at DESC, id DESC LIMIT 1
        `;
        params.push(cid, n, cid);
      } else {
        sql = `
          SELECT mileage, submitted_at FROM (
            SELECT mileage, submitted_at, id FROM pre_checkups
            WHERE UPPER(car_number)=? AND mileage IS NOT NULL AND mileage!=''
            UNION ALL
            SELECT mileage, submitted_at, id FROM post_mileage
            WHERE UPPER(car_number)=? AND mileage IS NOT NULL AND mileage!=''
          )
          ORDER BY submitted_at DESC, id DESC LIMIT 1
        `;
        params.push(n);
      }

      const r = db.prepare(sql).get(...params);
      return r ? { mileage: r.mileage, date: r.submitted_at } : { mileage: null, date: null };
    },
  };
}
