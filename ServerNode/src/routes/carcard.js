import path from 'path';
import fs from 'fs';
import { requireSession, errReply } from '../middleware/auth.js';

export default async function cardRoutes(fastify, { carDb, checkupDb, routeDb, sessionDb, userDb, dataRoot }) {
  // GET /api/car-card/:number
  fastify.get('/api/car-card/:number', async (req, reply) => {
    const login = sessionDb.getLogin(req.query.session);
    if (!login) return errReply(reply, 401, 'FORBIDDEN');

    const car = carDb.getByNumber(req.params.number);
    if (!car) return reply.send({ status: 'error', error: 'NOT_FOUND' });

    const { mileage, date } = checkupDb.getLastMileageByCarNumber(car.number, car.id);
    const lastLocs = routeDb.getCarLastLocations();
    const location = lastLocs[String(car.id)] || car.currentLocation || '';
    const photoPath = path.join(dataRoot, 'car-photos', car.number.trim().toUpperCase() + '.jpg');

    return reply.send({
      status: 'ok',
      car: {
        id: car.id,
        number: car.number,
        brand: car.brand,
        model: car.model,
        vin: car.vin,
        year: car.year,
        department: car.department,
        responsible: car.responsible,
        current_location: location,
        last_mileage: mileage || '',
        last_mileage_date: date || '',
        has_photo: fs.existsSync(photoPath),
        visible_in_routes: car.visibleInRoutes !== false,
        decommissioned_at: car.decommissionedAt || '',
        has_decommission_doc: !!car.decommissionDoc,
      },
    });
  });

  // GET /api/car-photo/:number
  fastify.get('/api/car-photo/:number', async (req, reply) => {
    const normalized = (req.params.number || '').trim().toUpperCase();
    if (!normalized) return reply.code(404).send();
    const photoPath = path.join(dataRoot, 'car-photos', normalized + '.jpg');
    if (!fs.existsSync(photoPath)) return reply.code(404).send();
    return reply.type('image/jpeg').send(fs.createReadStream(photoPath));
  });

  // POST /api/car-card/:number/photo — upload car photo (multipart)
  fastify.post('/api/car-card/:number/photo', async (req, reply) => {
    const login = sessionDb.getLogin(req.query.session);
    if (!login) return errReply(reply, 401, 'FORBIDDEN');

    const normalized = (req.params.number || '').trim().toUpperCase();
    if (!normalized) return reply.send({ status: 'error', error: 'BAD_NUMBER' });

    const data = await req.file();
    if (!data) return reply.send({ status: 'error', error: 'NO_FILE' });

    const photoDir = path.join(dataRoot, 'car-photos');
    fs.mkdirSync(photoDir, { recursive: true });
    const photoPath = path.join(photoDir, normalized + '.jpg');

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(photoPath);
      data.file.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
    });

    return reply.send({ status: 'ok' });
  });

  // GET /api/car-card/:number/routes
  fastify.get('/api/car-card/:number/routes', async (req, reply) => {
    const login = sessionDb.getLogin(req.query.session);
    if (!login) return errReply(reply, 401, 'FORBIDDEN');

    const normalized = (req.params.number || '').trim().toUpperCase();
    const carRec = carDb.getByNumber(req.params.number);
    const carId = carRec ? String(carRec.id) : null;

    const routes = routeDb.getAll()
      .filter(r =>
        (normalized && r.carNumber.toUpperCase() === normalized) ||
        (carId && r.carId === carId)
      )
      .map(r => ({
        id: r.id,
        created_at: r.createdAt,
        arrived_at: r.arrivedAt,
        departed_at: r.departedAt,
        from_location: r.fromLocation,
        to_location: r.toLocation,
        status: r.status,
        driver_name: r.driverName,
        driver_surname: r.driverSurname,
        driver_login: r.driverLogin,
        pre_checkup: r.preCheckupId !== null,
        post_checkup: r.postCheckupId !== null,
      }));

    return reply.send({ status: 'ok', routes });
  });
}
