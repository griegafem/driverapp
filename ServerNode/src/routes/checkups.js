import path from 'path';
import fs from 'fs';
import { requireSession, errReply } from '../middleware/auth.js';
import { savePhotoFromDataUri } from '../utils/photos.js';
import { decode as base36Decode } from '../utils/base36.js';
import { appendPreCheckupRow, appendPostCheckupRow } from '../utils/excel.js';

function toBool(v) {
  if (v === null || v === undefined) return undefined;
  const s = String(v).toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return undefined;
}

function photoUrl(id) {
  return id ? `/api/get-photo?id=${id}` : null;
}

export default async function checkupRoutes(fastify, { checkupDb, carDb, routeDb, sessionDb, userDb, dataRoot }) {
  fastify.post('/api/pre-checkup', async (req, reply) => {
    let user;
    try { user = requireSession(sessionDb, userDb, (req.body || {}).session); }
    catch (err) { return errReply(reply, err.statusCode || 401, err.error || 'SESSION_INVALID'); }

    const obj = (req.body || {}).data || {};
    const carRec = carDb.getByNumber(obj.number);
    const car = {
      number: carRec?.number || obj.number || '',
      brand: carRec?.brand || '',
      model: carRec?.model || '',
      vin: carRec?.vin || '',
      color: carRec?.color || '',
      year: carRec?.year || '',
      department: carRec?.department || '',
      responsible: carRec?.responsible || '',
    };

    const now = new Date();
    const submittedAt = now.toISOString().replace('T', ' ').slice(0, 19);

    const save = (dataUri, detail) => savePhotoFromDataUri(dataUri, car, detail, dataRoot);

    const pMileage = save(obj.photo_mileage, 'Фото пробега');
    const pRl      = save(obj.photo_rl,      'Фото перед лев');
    const pRr      = save(obj.photo_rr,      'Фото перед прав');
    const pBr      = save(obj.photo_br,      'Фото зад прав');
    const pBl      = save(obj.photo_bl,      'Фото зад лев');
    const pFront   = save(obj.photo_r,        'Фото спереди');
    const pRear    = save(obj.photo_b,        'Фото сзади');
    const pLeft    = save(obj.photo_l,        'Фото лев сторона');
    const pRight   = save(obj.photo_rg,       'Фото прав сторона');
    const pIrl     = save(obj.photo_irl,      'Фото салон перед лев');
    const pIrr     = save(obj.photo_irr,      'Фото салон перед прав');
    const pIbr     = save(obj.photo_ibr,      'Фото салон зад прав');
    const pIbl     = save(obj.photo_ibl,      'Фото салон зад лев');
    const pDay        = save(obj.photo_of_day,        'Фото дня');
    const pDash       = save(obj.photo_dashboard,     'Фото панели');
    const pWheelOk    = save(obj.random_wheel_photo,  'Фото колеса ОК');
    const pWheelDmg   = save(obj.wheel_damaged_photo, 'Фото повреждения колеса');

    const rowData = {
      'Дата записи': obj.date || '',
      'Время завершения отчёта': submittedAt,
      'Фамилия пользователя': user.surname,
      'Имя пользователя': user.name,
      'Тип отчёта': 'CheckUp',
      'ID автомобиля': carRec ? String(carRec.id) : (obj.car_id || ''),
      'Марка автомобиля': car.brand,
      'Модель автомобиля': car.model,
      'Госномер': car.number,
      'Пробег': obj.mileage || '',
      'Геолокация': obj.geo || '',
      'Состояние кузова': obj.body_condition || '',
      'Колёса ОК': obj.wheels_ok || '',
      'Повреждение колеса': obj.wheel_damaged || '',
      'Состояние салона': obj.interior_condition || '',
      'Уровень моторного масла проверен': obj.oil_checked === 'true' ? 'ДА' : '',
      'Уровень моторного масла': obj.oil_level || '',
      'Уровень антифриза в норме': obj.antifreeze_ok || '',
      'Тормозная жидкость': obj.brakefluid_level || '',
      'Омывающей жидкости больше 80%': obj.glasswasher_ok || '',
      'Освещение проверено': obj.lighting_ok || '',
      'Аварийный набор': obj.emergency_kit_ok || '',
      'Состояние стёкол': obj.glass_condition || '',
      'Уровень топлива': obj.fuel_level || '',
      'Ошибки приборной панели': obj.dashboard_errors || '',
      'СТС': obj.registration_ok || '',
      'ОСАГО до': obj.osago_date || '',
      'Пожелания по авто': obj.additional_info || '',
      'Критические замечания': obj.critical_info || '',
      'Wifi': obj.wifi || '',
      'VPN': obj.vpn || '',
      'Быстрый выезд': obj.quick_exit === 'true' ? 'ДА' : '',
      'Фото пробега': photoUrl(pMileage) || '',
      'Фото передний левый угол': photoUrl(pRl) || '',
      'Фото передний правый угол': photoUrl(pRr) || '',
      'Фото задний правый угол': photoUrl(pBr) || '',
      'Фото задний левый угол': photoUrl(pBl) || '',
      'Фото спереди': photoUrl(pFront) || '',
      'Фото задняя часть': photoUrl(pRear) || '',
      'Фото левая сторона': photoUrl(pLeft) || '',
      'Фото правая сторона': photoUrl(pRight) || '',
      'Фото открытая передняя левая дверь': photoUrl(pIrl) || '',
      'Фото открытая передняя правая дверь': photoUrl(pIrr) || '',
      'Фото открытая задняя правая дверь': photoUrl(pIbr) || '',
      'Фото открытая задняя левая дверь': photoUrl(pIbl) || '',
      'Фото дня': photoUrl(pDay) || '',
      'Фото приборной панели': photoUrl(pDash) || '',
    };

    appendPreCheckupRow(dataRoot, rowData).catch(() => {}); // fire-and-forget

    try {
      const checkupId = checkupDb.insertPreCheckup({
        submittedAt,
        userLogin: user.login,
        userName: user.name,
        userSurname: user.surname,
        carId: carRec ? String(carRec.id) : (obj.car_id || null),
        carNumber: car.number,
        carBrand: car.brand,
        carModel: car.model,
        carType: carRec?.vehicleType || null,
        geo: obj.geo || null,
        bodyCondition: obj.body_condition || null,
        wheelsOk: toBool(obj.wheels_ok),
        wheelDamaged: toBool(obj.wheel_damaged),
        interiorCondition: obj.interior_condition || null,
        oilChecked: toBool(obj.oil_checked),
        oilLevel: obj.oil_level || null,
        coolantOk: toBool(obj.antifreeze_ok),
        brakeFluid: obj.brakefluid_level || null,
        washerOk: toBool(obj.glasswasher_ok),
        lightingOk: toBool(obj.lighting_ok),
        emergencyKitOk: toBool(obj.emergency_kit_ok),
        glassCondition: obj.glass_condition || null,
        mileage: obj.mileage || null,
        fuelLevel: obj.fuel_level || null,
        dashboardErrors: toBool(obj.dashboard_errors),
        registrationOk: toBool(obj.registration_ok),
        osagoDate: obj.osago_date || null,
        osagoMissing: toBool(obj.osago_missing),
        wifi: obj.wifi || null,
        vpn: obj.vpn || null,
        additionalInfo: obj.additional_info || null,
        criticalInfo: obj.critical_info || null,
        quickExit: toBool(obj.quick_exit),
        photoMileage: pMileage, photoRl: pRl, photoRr: pRr, photoBr: pBr, photoBl: pBl,
        photoFront: pFront, photoRear: pRear, photoLeft: pLeft, photoRight: pRight,
        photoIrl: pIrl, photoIrr: pIrr, photoIbr: pIbr, photoIbl: pIbl,
        photoOfDay: pDay, photoDashboard: pDash,
        photoWheelOk: pWheelOk, photoWheelDamaged: pWheelDmg,
      });

      const routeIdStr = obj.route_id;
      if (routeIdStr) {
        const routeId = parseInt(routeIdStr, 10);
        if (routeId > 0) routeDb.setPreCheckup(routeId, checkupId);
      }
    } catch (e) {
      console.error('[pre-checkup] insert error:', e.message);
    }

    return reply.send({ status: 'ok' });
  });

  fastify.post('/api/post-checkup', async (req, reply) => {
    let user;
    try { user = requireSession(sessionDb, userDb, (req.body || {}).session); }
    catch (err) { return errReply(reply, err.statusCode || 401, err.error || 'SESSION_INVALID'); }

    const obj = (req.body || {}).data || {};
    const carRec = carDb.getByNumber(obj.number);
    const car = {
      number: carRec?.number || obj.number || '',
      brand: carRec?.brand || '',
      model: carRec?.model || '',
    };

    const save = (dataUri, detail) => savePhotoFromDataUri(dataUri, car, detail, dataRoot);

    const p = {
      mileage: save(obj.photo_mileage, 'По приезду Фото пробега'),
      rl:      save(obj.photo_rl,      'По приезду Фото передний левый угол'),
      rr:      save(obj.photo_rr,      'По приезду Фото передний правый угол'),
      br:      save(obj.photo_br,      'По приезду Фото задний правый угол'),
      bl:      save(obj.photo_bl,      'По приезду Фото задний левый угол'),
      front:   save(obj.photo_r,       'По приезду Фото спереди'),
      rear:    save(obj.photo_b,       'По приезду Фото задняя часть'),
      left:    save(obj.photo_l,       'По приезду Фото левая сторона'),
      right:   save(obj.photo_rg,      'По приезду Фото правая сторона'),
      irl:     save(obj.photo_irl,     'По приезду Фото открытая передняя левая дверь'),
      irr:     save(obj.photo_irr,     'По приезду Фото открытая передняя правая дверь'),
      ibr:     save(obj.photo_ibr,     'По приезду Фото открытая задняя правая дверь'),
      ibl:     save(obj.photo_ibl,     'По приезду Фото открытая задняя левая дверь'),
      ofDay:   save(obj.photo_of_day,  'По приезду Фото дня'),
      damage:  save(obj.damage_photo,  'По приезду Повреждение'),
      dash:    save(obj.photo_dashboard, 'По приезду Фото панели'),
      charger: save(obj.photo_charger,   'По приезду Фото зарядных проводов'),
    };
    const pid = id => id ? `/api/get-photo?id=${id}` : '';

    const rowData = {
      'Дата записи': obj.date || '',
      'Время завершения отчёта': new Date().toLocaleString('ru-RU'),
      'Фамилия пользователя': user.surname,
      'Имя пользователя': user.name,
      'Тип отчёта': 'CheckUp после приезда',
      'ID автомобиля': carRec ? String(carRec.id) : (obj.car_id || ''),
      'Марка автомобиля': car.brand,
      'Модель автомобиля': car.model,
      'Госномер': car.number,
      'Тип ТС': obj.car_type || '',
      'Пробег': obj.mileage || '',
      'Геолокация': obj.geo || '',
      'Уровень моторного масла': obj.oil_level || '',
      'Уровень антифриза в норме': obj.antifreeze_ok || '',
      'Тормозная жидкость': obj.brakefluid_level || '',
      'Омывающей жидкости больше 80%': obj.glasswasher_ok || '',
      'Пожелания по авто': obj.additional_info || '',
      'Критические замечания': obj.critical_info || '',
      'Уровень топлива': obj.fuel_level || '',
      'Авто чистый': obj.clean_ok || '',
      'Салон проверен и чист': obj.interior_ok || '',
      'Wifi': obj.wifi || '',
      'VPN': obj.vpn || '',
      'Локация': obj.location || '',
      'Фото пробега':                   pid(p.mileage),
      'Фото передний левый угол':       pid(p.rl),
      'Фото передний правый угол':      pid(p.rr),
      'Фото задний правый угол':        pid(p.br),
      'Фото задний левый угол':         pid(p.bl),
      'Фото спереди':                   pid(p.front),
      'Фото задняя часть':              pid(p.rear),
      'Фото левая сторона':             pid(p.left),
      'Фото правая сторона':            pid(p.right),
      'Фото открытая передняя левая дверь':  pid(p.irl),
      'Фото открытая передняя правая дверь': pid(p.irr),
      'Фото открытая задняя правая дверь':   pid(p.ibr),
      'Фото открытая задняя левая дверь':    pid(p.ibl),
      'Фото дня':                       pid(p.ofDay),
      'Фото повреждения':               pid(p.damage),
      'Фото панели':                    pid(p.dash),
      'Фото зарядных проводов':         pid(p.charger),
    };

    appendPostCheckupRow(dataRoot, rowData).catch(() => {}); // fire-and-forget

    try {
      const postSubmittedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const postId = checkupDb.insertPostCheckup({
        submittedAt:  postSubmittedAt,
        carNumber:    car.number,
        carId:        carRec ? String(carRec.id) : null,
        mileage:      obj.mileage || null,
        userLogin:    user.login,
        userName:     user.name,
        userSurname:  user.surname,
        carBrand:     car.brand,
        carModel:     car.model,
        carType:      obj.car_type || null,
        geo:          obj.geo || null,
        oilLevel:     obj.oil_level || null,
        coolantOk:    obj.antifreeze_ok,
        brakeFluid:   obj.brakefluid_level || null,
        washerOk:     obj.glasswasher_ok,
        fuelLevel:    obj.fuel_level || null,
        cleanOk:      obj.clean_ok,
        interiorOk:   obj.interior_ok,
        wifi:         obj.wifi || null,
        vpn:          obj.vpn || null,
        locationName: obj.location || null,
        additionalInfo: obj.additional_info || null,
        criticalInfo:   obj.critical_info || null,
        photoMileage: p.mileage, photoRl: p.rl, photoRr: p.rr,
        photoBr: p.br, photoBl: p.bl, photoFront: p.front,
        photoRear: p.rear, photoLeft: p.left, photoRight: p.right,
        photoIrl: p.irl, photoIrr: p.irr, photoIbr: p.ibr, photoIbl: p.ibl,
        photoOfDay: p.ofDay, photoDamage: p.damage,
        lightingOk:    obj.lighting_ok,
        emergencyKitOk: obj.emergency_kit_ok,
        glassCondition: obj.glass_condition || null,
        dashboardErrors: obj.dashboard_errors,
        photoDashboard: p.dash, photoCharger: p.charger,
        registrationOk: obj.registration_ok,
        osagoDate:     obj.osago_date || null,
        osagoMissing:  obj.osago_missing,
      });
      const routeIdStr = obj.route_id;
      if (postId > 0 && routeIdStr) {
        const routeId = parseInt(routeIdStr, 10);
        if (routeId > 0) routeDb.setPostCheckup(routeId, postId);
      }
    } catch (e) {
      console.error('[post-checkup] save error:', e.message);
    }

    return reply.send({ status: 'ok' });
  });

  fastify.post('/api/tech-inspection', async (req, reply) => {
    let user;
    try { user = requireSession(sessionDb, userDb, (req.body || {}).session); }
    catch (err) { return errReply(reply, err.statusCode || 401, err.error || 'SESSION_INVALID'); }

    const obj = (req.body || {}).data || {};
    const carRec = carDb.getByNumber(obj.number);
    const car = {
      number: carRec?.number || obj.number || '',
      brand:  carRec?.brand  || '',
      model:  carRec?.model  || '',
    };

    const save = (dataUri, detail) => savePhotoFromDataUri(dataUri, car, detail, dataRoot);

    const p = {
      rl:      save(obj.photo_rl,      'ТехОсмотр Пер.лев угол'),
      rr:      save(obj.photo_rr,      'ТехОсмотр Пер.прав угол'),
      br:      save(obj.photo_br,      'ТехОсмотр Зад.прав угол'),
      bl:      save(obj.photo_bl,      'ТехОсмотр Зад.лев угол'),
      front:   save(obj.photo_front,   'ТехОсмотр Спереди'),
      rear:    save(obj.photo_rear,    'ТехОсмотр Сзади'),
      left:    save(obj.photo_left,    'ТехОсмотр Лев сторона'),
      right:   save(obj.photo_right,   'ТехОсмотр Прав сторона'),
      wfl:     save(obj.photo_wfl,     'ТехОсмотр Пер.лев колесо'),
      wfl_t:   save(obj.photo_wfl_t,   'ТехОсмотр Пер.лев протектор'),
      wfr:     save(obj.photo_wfr,     'ТехОсмотр Пер.прав колесо'),
      wfr_t:   save(obj.photo_wfr_t,   'ТехОсмотр Пер.прав протектор'),
      wrl:     save(obj.photo_wrl,     'ТехОсмотр Зад.лев колесо'),
      wrl_t:   save(obj.photo_wrl_t,   'ТехОсмотр Зад.лев протектор'),
      wrr:     save(obj.photo_wrr,     'ТехОсмотр Зад.прав колесо'),
      wrr_t:   save(obj.photo_wrr_t,   'ТехОсмотр Зад.прав протектор'),
      irl:     save(obj.photo_irl,     'ТехОсмотр Салон вод.дверь'),
      irr:     save(obj.photo_irr,     'ТехОсмотр Салон пер.прав дверь'),
      ibr:     save(obj.photo_ibr,     'ТехОсмотр Салон зад.прав дверь'),
      ibl:     save(obj.photo_ibl,     'ТехОсмотр Салон зад.лев дверь'),
      engine:  save(obj.photo_engine,  'ТехОсмотр Мотор'),
      trunk:   save(obj.photo_trunk,   'ТехОсмотр Багаж'),
    };

    try {
      const submittedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
      checkupDb.insertTechInspection({
        submittedAt,
        carNumber:   car.number,
        carBrand:    car.brand,
        carModel:    car.model,
        carType:     carRec?.vehicleType || null,
        userLogin:   user.login,
        userName:    user.name,
        userSurname: user.surname,
        geo:         obj.geo || null,
        photoRl: p.rl, photoRr: p.rr, photoBr: p.br, photoBl: p.bl,
        photoFront: p.front, photoRear: p.rear, photoLeft: p.left, photoRight: p.right,
        photoWfl: p.wfl, photoWflT: p.wfl_t, photoWfr: p.wfr, photoWfrT: p.wfr_t,
        photoWrl: p.wrl, photoWrlT: p.wrl_t, photoWrr: p.wrr, photoWrrT: p.wrr_t,
        wheelsOk:    obj.wheels_ok,
        photoIrl: p.irl, photoIrr: p.irr, photoIbr: p.ibr, photoIbl: p.ibl,
        photoEngine: p.engine, photoTrunk: p.trunk,
        additionalInfo: obj.additional_info || null,
      });
    } catch (e) {
      console.error('[tech-inspection] save error:', e.message);
    }

    return reply.send({ status: 'ok' });
  });

  fastify.get('/api/get-photo', async (req, reply) => {
    const key = req.query.id || '';
    if (!key) return reply.code(404).send('Фото не найдено');

    let relPath;
    try { relPath = base36Decode(key); } catch { return reply.code(400).send('Фото не найдено'); }
    if (!relPath) return reply.code(404).send('Фото не найдено');

    const fullPath = path.resolve(dataRoot, relPath);
    if (!fullPath.startsWith(path.resolve(dataRoot))) return reply.code(403).send('Фото не найдено');
    if (!fs.existsSync(fullPath)) return reply.code(404).send('Фото не найдено');

    return reply.type('image/jpeg').send(fs.createReadStream(fullPath));
  });
}
