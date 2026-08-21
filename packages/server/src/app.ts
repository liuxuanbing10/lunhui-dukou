import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import type Database from 'better-sqlite3';
import { initDb, closeDb } from './db/index.js';
import { registerRoutes } from './routes/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database.Database;
  }
  interface FastifyRequest {
    /** 有意设置：受保护路由注入玩家 id（来自 JWT sub） */
    playerId: number;
  }
  interface FastifyContextConfig {
    /** 自定义路由标记：public=true 的路由跳过鉴权守卫 */
    public?: boolean;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; username: string };
    user: { sub: string; username: string };
  }
}

/** JWT 密钥：production 必须显式提供；开发用内置默认值便于本地跑通。 */
function jwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return 'lunhui-dev-only-secret';
}

export function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const db = initDb();
  app.decorate('db', db);
  app.addHook('onClose', async () => closeDb());

  app.register(jwt, { secret: jwtSecret(), sign: { expiresIn: '7d' } });
  app.register(websocket);

  // 鉴权守卫：除 public 路由外，必须携带有效 Bearer token。
  // 通过后把 playerId 注入 request（供后续路由/服务读取）。
  app.addHook('onRequest', async (req, reply) => {
    const cfg = req.routeOptions.config as { public?: boolean };
    if (cfg.public === true) return;
    try {
      await req.jwtVerify();
      req.playerId = Number(req.user.sub);
    } catch {
      return reply
        .code(401)
        .send({ error: { code: 'UNAUTHORIZED', message: '未登录或 token 失效' } });
    }
  });

  void registerRoutes(app);
  return app;
}