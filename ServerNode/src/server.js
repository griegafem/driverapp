import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { createUserDb } from './db/users.js';
import { createCarDb } from './db/cars.js';
import { createLocationDb } from './db/locations.js';
import { createRouteDb } from './db/routes.js';
import { createCheckupDb } from './db/checkups.js';
import { createSessionDb } from './db/sessions.js';
import { initExcel } from './utils/excel.js';

import authRoutes from './routes/auth.js';
import carRoutes from './routes/cars.js';
import locationRoutes from './routes/locations.js';
import userRoutes from './routes/users.js';
import checkupRoutes from './routes/checkups.js';
import routeRoutes from './routes/routes.js';
import cardRoutes from './routes/carcard.js';
import reportRoutes from './routes/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDataRoot() {
  const env = process.env.MOTORSHARKS_DATA_DIR;
  if (env) return path.resolve(env);
  // Dev: repo root/data
  const repoData = path.resolve(__dirname, '../../data');
  if (fs.existsSync(repoData)) return repoData;
  return path.resolve(__dirname, '../data');
}

function resolveClientDir() {
  const candidates = [
    path.resolve(__dirname, '../../Client'),
    path.resolve(__dirname, '../Client'),
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

export async function buildApp(opts = {}) {
  const fastify = Fastify({
    logger: opts.logger ?? { level: 'info' },
    bodyLimit: 200 * 1024 * 1024, // 200 MB — pre-checkup может содержать 15 фото в base64
    ...opts.fastifyOpts,
  });

  const dataRoot = opts.dataRoot || resolveDataRoot();
  fs.mkdirSync(dataRoot, { recursive: true });
  fs.mkdirSync(path.join(dataRoot, 'Photo'), { recursive: true });
  fs.mkdirSync(path.join(dataRoot, 'car-photos'), { recursive: true });

  await initExcel(dataRoot);

  // DB layer
  const userDb = createUserDb(dataRoot);
  const sessionDb = createSessionDb(dataRoot);
  const carDb = createCarDb(dataRoot);
  const locationDb = createLocationDb(dataRoot);
  const routeDb = createRouteDb(dataRoot);
  const checkupDb = createCheckupDb(dataRoot);

  const ctx = { userDb, sessionDb, carDb, locationDb, routeDb, checkupDb, dataRoot };

  // Plugins
  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  });

  await fastify.register(fastifyRateLimit, {
    max: 60,
    timeWindow: '1 minute',
    // GET-запросы read-only — не лимитируем; защищаем только мутирующие POST/PUT/DELETE
    allowList: (req) => req.method === 'GET',
  });

  // Error handler
  fastify.setErrorHandler((error, req, reply) => {
    const errId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    fastify.log.error({ errId, err: error }, error.message);
    const isReportPage = req.url.startsWith('/driver-app/pre-checkups') ||
                         req.url.startsWith('/driver-app/post-checkups');
    if (isReportPage) {
      const status = error.statusCode || 500;
      const msg = status === 429
        ? 'Слишком много запросов. Подождите минуту и повторите.'
        : 'Внутренняя ошибка сервера.';
      const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Ошибка</title>
<style>body{font-family:Arial;background:#f5f5f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{background:#fff;border:1px solid #fca5a5;border-radius:10px;padding:32px 40px;text-align:center;max-width:480px}
h2{color:#dc2626;margin:0 0 12px}p{color:#374151;margin:0 0 8px}
.id{font-size:11px;color:#9ca3af;font-family:monospace}
a{display:inline-block;margin-top:20px;background:#2563eb;color:#fff;padding:8px 20px;border-radius:6px;text-decoration:none}</style>
</head><body><div class="box"><h2>Ошибка ${status}</h2><p>${msg}</p>
<p class="id">ID: ${errId}</p><a href="javascript:history.back()">← Назад</a></div></body></html>`;
      return reply.code(status).type('text/html; charset=utf-8').send(html);
    }
    reply.code(error.statusCode || 500).send({ status: 'error', error: 'SERVER_ERROR', errId });
  });

  // Health
  fastify.get('/test', async () => 'OK');

  // Help page
  fastify.get('/help', async (req, reply) => {
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Техподдержка</title>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f7f7f7;color:#111827;display:flex;align-items:flex-start;justify-content:center;padding:18px;line-height:1.55}
    .wrap{width:min(520px,100%);margin-top:10vh;text-align:center}
    .logo{width:120px;height:120px;border-radius:28px;object-fit:contain;background:#fff;box-shadow:0 16px 44px rgba(17,24,39,.12)}
    .card{margin-top:22px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 10px 26px rgba(17,24,39,.10);padding:18px;text-align:left}
    h1{font-size:18px;margin:0 0 6px}
    p{margin:0 0 14px;color:#6b7280;font-size:14px}
    .grid{display:grid;gap:10px}
    a.btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 14px;border-radius:14px;text-decoration:none;background:#2563eb;color:#fff;border:1px solid rgba(37,99,235,.22);font-weight:600;transition:filter 160ms,transform 160ms}
    a.btn:hover{filter:brightness(.95)}
    a.btn:active{transform:translateY(1px) scale(.99);filter:brightness(.9)}
    .hint{margin-top:12px;font-size:12px;color:#6b7280;text-align:center}
  </style>
</head>
<body>
  <div class="wrap">
    <img class="logo" src="/driver-app/assets/logo.png" alt="Motorsharks" />
    <div class="card">
      <h1>Техподдержка</h1>
      <p>Выберите удобный канал связи.</p>
      <div class="grid">
        <a class="btn" href="https://t.me/MYGaluev" target="_blank" rel="noreferrer">Telegram @MYGaluev</a>
        <a class="btn" href="mailto:MYGaluev@mail.ru">Email</a>
        <a class="btn" href="/driver-app/">← Вернуться в приложение</a>
      </div>
      <div class="hint">Если ссылки не открываются внутри WebApp — откройте в браузере.</div>
    </div>
  </div>
</body>
</html>`;
    return reply.type('text/html; charset=utf-8').send(html);
  });

  // Static files
  const clientDir = opts.clientDir || resolveClientDir();
  if (clientDir) {
    await fastify.register(fastifyStatic, {
      root: clientDir,
      prefix: '/driver-app',
      decorateReply: false,
      setHeaders(res, filePath, stat) {
        const url = res.req?.url || '';
        if (url.includes('v=')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      },
    });

    fastify.get('/driver-app/', async (req, reply) => {
      return reply.type('text/html; charset=utf-8').send(
        fs.createReadStream(path.join(clientDir, 'index.html'))
      );
    });

    fastify.get('/login', async (req, reply) => {
      return reply.type('text/html; charset=utf-8').send(
        fs.createReadStream(path.join(clientDir, 'login.html'))
      );
    });
  } else {
    fastify.get('/driver-app/', async (req, reply) =>
      reply.code(503).send({ status: 'error', error: 'CLIENT_NOT_FOUND' })
    );
    fastify.get('/login', async (req, reply) => reply.redirect('/driver-app/'));
  }

  fastify.get('/', async (req, reply) => reply.redirect('/driver-app/'));

  // API routes
  await fastify.register(authRoutes, ctx);
  await fastify.register(carRoutes, ctx);
  await fastify.register(locationRoutes, ctx);
  await fastify.register(userRoutes, ctx);
  await fastify.register(checkupRoutes, ctx);
  await fastify.register(routeRoutes, ctx);
  await fastify.register(cardRoutes, ctx);
  await fastify.register(reportRoutes, ctx);

  return fastify;
}

// Start server when run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '8080', 10);
  await app.listen({ port, host: '0.0.0.0' });
}
