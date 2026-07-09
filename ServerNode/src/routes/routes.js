import { requireSession, requireAdmin, errReply } from '../middleware/auth.js';
import { isAdminRole } from '../db/users.js';
import path from 'path';
import fs from 'fs';

function routeToObj(r) {
  return {
    id: r.id,
    created_at: r.createdAt,
    car_id: r.carId,
    car_number: r.carNumber,
    car_brand: r.carBrand,
    car_model: r.carModel,
    driver_login: r.driverLogin,
    driver_name: r.driverName,
    driver_surname: r.driverSurname,
    from_location: r.fromLocation,
    to_location: r.toLocation,
    status: r.status,
    pre_checkup_id: r.preCheckupId,
    post_checkup_id: r.postCheckupId,
    departed_at: r.departedAt,
    arrived_at: r.arrivedAt,
  };
}

export default async function routeRoutes(fastify, { routeDb, carDb, locationDb, userDb, sessionDb, dataRoot }) {
  // GET /api/routes — driver sees own, admin sees all
  fastify.get('/api/routes', async (req, reply) => {
    let user;
    try { user = requireSession(sessionDb, userDb, req.query.session); }
    catch (err) { return errReply(reply, err.statusCode || 401, err.error || 'FORBIDDEN'); }

    const routes = isAdminRole(user.role)
      ? routeDb.getAll()
      : routeDb.getByDriver(user.login);

    return reply.send({ status: 'ok', routes: routes.map(routeToObj) });
  });

  // POST /api/routes — create route
  fastify.post('/api/routes', async (req, reply) => {
    let user;
    try { user = requireSession(sessionDb, userDb, (req.body || {}).session); }
    catch (err) { return errReply(reply, err.statusCode || 401, err.error || 'FORBIDDEN'); }

    const { car_number, from_location = '', to_location = '' } = req.body || {};
    const carNumber = (car_number || '').trim();
    const toLoc = (to_location || '').trim();
    if (!carNumber || !toLoc) return reply.send({ status: 'error', error: 'BAD_DATA' });

    const carRec = carDb.getByNumber(carNumber);
    const carId = carRec ? String(carRec.id) : carNumber;

    if (routeDb.getActiveByCarId(carId)) {
      return reply.send({ status: 'error', error: 'CAR_BUSY' });
    }

    const now = new Date().toISOString();
    const id = routeDb.insert({
      createdAt: now,
      carId,
      carNumber,
      carBrand: carRec?.brand || '',
      carModel: carRec?.model || '',
      driverLogin: user.login,
      driverName: user.name || '',
      driverSurname: user.surname || '',
      fromLocation: (from_location || '').trim(),
      toLocation: toLoc,
      departedAt: now,
    });

    const route = routeDb.getById(id);
    return reply.send({ status: 'ok', route: routeToObj(route) });
  });

  // POST /api/routes/:id/complete
  fastify.post('/api/routes/:id/complete', async (req, reply) => {
    let user;
    try { user = requireSession(sessionDb, userDb, (req.body || {}).session); }
    catch (err) { return errReply(reply, err.statusCode || 401, err.error || 'FORBIDDEN'); }

    const routeId = parseInt(req.params.id, 10);
    const route = routeDb.getById(routeId);
    if (!route) return reply.send({ status: 'error', error: 'NOT_FOUND' });

    if (!isAdminRole(user.role) && route.driverLogin.toLowerCase() !== user.login.toLowerCase()) {
      return errReply(reply, 403, 'FORBIDDEN');
    }

    routeDb.complete(routeId, new Date().toISOString());
    if (route.toLocation && route.carNumber) {
      carDb.updateLocation(route.carNumber, route.toLocation);
    }
    return reply.send({ status: 'ok' });
  });

  // GET /api/routes/active-cars
  fastify.get('/api/routes/active-cars', async (req, reply) => {
    const login = sessionDb.getLogin(req.query.session);
    if (!login) return errReply(reply, 401, 'FORBIDDEN');

    const activeRoutes = routeDb.getAll().filter(r => r.status === 'active');
    const car_ids = [...new Set(activeRoutes.map(r => r.carId))];
    const active_car_numbers = [...new Set(activeRoutes.map(r => r.carNumber.toUpperCase()))];
    return reply.send({ status: 'ok', car_ids, active_car_numbers });
  });

  // GET /api/routes/board — admin board
  fastify.get('/api/routes/board', async (req, reply) => {
    let admin;
    try { admin = requireAdmin(sessionDb, userDb, req.query.session); }
    catch (err) { return errReply(reply, err.statusCode || 403, err.error || 'FORBIDDEN'); }

    const locations = locationDb.getAll().map(l => l.name);
    const allCars = carDb.getAll().filter(c => !c.decommissionedAt);
    const lastLocs = routeDb.getCarLastLocations();
    const activeByCarId = {};
    for (const r of routeDb.getAll().filter(r => r.status === 'active')) {
      activeByCarId[r.carId] = r;
    }

    const cars = allCars.map(c => {
      const active = activeByCarId[String(c.id)] || null;
      const routeLoc = lastLocs[String(c.id)] || '';
      const currentLoc = routeLoc || c.currentLocation || '';
      const photoPath = path.join(dataRoot, 'car-photos', (c.number || '').trim().toUpperCase() + '.jpg');
      return {
        car_id: String(c.id),
        car_number: c.number,
        car_brand: c.brand,
        car_model: c.model,
        current_location: currentLoc,
        has_photo: fs.existsSync(photoPath),
        active_route: active ? routeToObj(active) : null,
        visible_in_routes: c.visibleInRoutes !== false,
      };
    });

    return reply.send({ status: 'ok', locations, cars });
  });
}
