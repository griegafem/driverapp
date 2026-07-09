import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildApp } from '../src/server.js';

export async function createTestApp() {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'driverapp-test-'));

  const app = await buildApp({
    logger: false,
    dataRoot,
    clientDir: null,
    fastifyOpts: { logger: false },
  });

  await app.ready();

  return {
    app,
    dataRoot,
    async cleanup() {
      await app.close();
      fs.rmSync(dataRoot, { recursive: true, force: true });
    },
    async post(url, body, sessionToken) {
      const payload = sessionToken
        ? { ...body, session: sessionToken }
        : body;
      const res = await app.inject({ method: 'POST', url, payload });
      return { status: res.statusCode, body: res.json() };
    },
    async get(url, query = {}) {
      const qs = new URLSearchParams(query).toString();
      const fullUrl = qs ? `${url}?${qs}` : url;
      const res = await app.inject({ method: 'GET', url: fullUrl });
      return { status: res.statusCode, body: res.json() };
    },
  };
}

export async function loginAdmin(h) {
  const res = await h.post('/api/login', { login: 'admin', password: '1' });
  return res.body.session;
}
