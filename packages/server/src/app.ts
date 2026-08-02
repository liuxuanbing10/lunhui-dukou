import Fastify, { type FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { initDb, closeDb } from './db/index.js';
import { registerRoutes } from './routes/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database.Database;
  }
}

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  const db = initDb();

  // 挂 db 到实例
  app.decorate('db', db);
  app.addHook('onClose', async () => closeDb());

  void registerRoutes(app);

  return app;
}
