import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import type Database from 'better-sqlite3';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
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

/** JWT 签发者/受众：签发与验签双向校验，防跨域复用 token。 */
const JWT_ISSUER = 'lunhui-dukou';
const JWT_AUDIENCE = 'lunhui-dukou-app';

/** JWT 密钥：production 必须显式提供（否则任何拿到默认密钥者都可伪造 token）；开发用内置默认值便于本地跑通。 */
function jwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  process.emitWarning(
    'JWT uses the built-in development default secret. Set JWT_SECRET + NODE_ENV=production before deploying.',
  );
  return 'lunhui-dev-only-secret';
}

/** CORS 白名单（env CORS_ORIGIN，逗号分隔）。桌面原生客户端不发 Origin 头、不受限；仅限制浏览器直连跨域。 */
function corsOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 可信代理 CIDR（env TRUST_PROXY）→ 保证反代后 req.ip 仍为真实客户端 IP，登录/注册 IP 限流才有效。 */
function proxyTrustList(): string[] {
  const raw =
    process.env.TRUST_PROXY ?? '127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildApp() {
  const app = Fastify({ logger: true, trustProxy: proxyTrustList() }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const db = initDb();
  app.decorate('db', db);
  app.addHook('onClose', async () => closeDb());

  app.register(jwt, {
    secret: jwtSecret(),
    sign: { expiresIn: '7d', issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
    verify: { issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
  });
  app.register(websocket);

  // 安全头（helmet）与 CORS 白名单：桌面客户端不受 Origin 限制，仅约束浏览器直连
  app.register(helmet);
  app.register(cors, { origin: corsOrigins() });

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