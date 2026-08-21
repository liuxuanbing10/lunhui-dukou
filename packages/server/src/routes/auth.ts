/**
 * 鉴权路由：register / login（公开，不需 token）
 * --------------------------------------------------
 * 对齐 DESKTOP_MIGRATION.md Phase 1 第 1/3 项：JWT 登录 + 按 IP 限流（防爆破）。
 * 响应字段统一 camelCase；错误统一 { error: { code, message } } 形状。
 */
import { z } from 'zod';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { registerPlayer, authenticatePlayer } from '../services/auth-service.js';
import { AppError } from '../utils/app-error.js';
import { rateLimit } from '../services/rate-limiter.js';

const Credentials = z.object({
  username: z.string().min(1, 'username 必填'),
  password: z.string().min(1, 'password 必填'),
});

const ERROR_HTTP: Record<string, number> = {
  USERNAME_TAKEN: 409,
  USERNAME_INVALID: 400,
  WEAK_PASSWORD: 400,
};

function loginRateMax(): number {
  return Number(process.env.RATE_LIMIT_LOGIN_MAX ?? '5');
}
function loginRateWindow(): number {
  return Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS ?? '60000');
}

type CredentialsBody = z.infer<typeof Credentials>;

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/auth/register 注册 → 返回 token
  app.post(
    '/api/auth/register',
    { schema: { body: Credentials }, config: { public: true } },
    async (req: FastifyRequest<{ Body: CredentialsBody }>, reply: FastifyReply) => {
      const { username, password } = req.body;
      try {
        const id = registerPlayer(app.db, username, password);
        const token = app.jwt.sign({ sub: String(id), username });
        return { playerId: id, username, token };
      } catch (err) {
        const e = err instanceof AppError ? err : new AppError('UNKNOWN');
        const http = ERROR_HTTP[e.code] ?? 500;
        return reply.code(http).send({ error: { code: e.code, message: e.code } });
      }
    },
  );

  // POST /api/auth/login 登录 → 返回 token
  app.post(
    '/api/auth/login',
    { schema: { body: Credentials }, config: { public: true } },
    async (req: FastifyRequest<{ Body: CredentialsBody }>, reply: FastifyReply) => {
      const { username, password } = req.body;
      // 按 IP 限流：防爆破
      if (!rateLimit(`login:${req.ip}`, loginRateMax(), loginRateWindow())) {
        return reply
          .code(429)
          .send({ error: { code: 'RATE_LIMITED', message: '尝试过于频繁，请稍后再试' } });
      }
      const player = authenticatePlayer(app.db, username, password);
      if (!player) {
        return reply
          .code(401)
          .send({ error: { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' } });
      }
      const token = app.jwt.sign({ sub: String(player.id), username: player.username });
      return { playerId: player.id, username: player.username, token };
    },
  );
}