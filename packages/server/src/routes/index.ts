/**
 * API 路由注册（对齐 docs/API_CONTRACT.md + DESKTOP_MIGRATION.md Phase 1）
 * 请求体/参数校验：zod via fastify-type-provider-zod
 * 错误统一形状：{ error: { code, message } }
 * Phase 1：除 auth/health 外均需 Bearer token（app.ts 守卫）；playerId 由 JWT 注入。
 */
import { z } from 'zod';
import { seedResidents } from '../db/seed.js';
import {
  askQuestion,
  makeChoice,
  playerMemory,
  startNewLoop,
} from '../services/loop-service.js';
import { rateLimit } from '../services/rate-limiter.js';
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import { AppError } from '../utils/app-error.js';
import { registerAuthRoutes } from './auth.js';
import { registerEventsStream } from './events-stream.js';

const ERROR_HTTP: Record<string, number> = {
  NO_QUESTIONS_LEFT: 403,
  LOOP_NOT_FOUND: 404,
  RESIDENT_NOT_ACTIVE: 404,
  LOOP_ENDED: 409,
  RATE_LIMITED: 429,
};

function toError(err: unknown): { code: string; message: string; http: number } {
  const code =
    err instanceof AppError ? err.code : err instanceof Error ? err.message : 'UNKNOWN';
  const http = ERROR_HTTP[code] ?? 500;
  return { code, message: code, http };
}

// ---- Zod Schemas ----

const AskBody = z.object({
  loop_id: z.number({ message: 'loop_id 必填且为数字' }),
  resident_id: z.string().min(1, 'resident_id 必填'),
  question: z.string().min(1, 'question 必填'),
});

const ChoiceBody = z.object({
  choice: z.string().min(1, 'choice 必填'),
});

const LoopIdParams = z.object({
  id: z.string().regex(/^\d+$/, 'id 必须为正整数'),
});

// ---- 限流参数（/api/ask 按玩家，见 DESKTOP_MIGRATION.md Phase 1 第 3 项） ----
function askRateMax(): number {
  return Number(process.env.RATE_LIMIT_ASK_MAX ?? '20');
}
function askRateWindow(): number {
  return Number(process.env.RATE_LIMIT_ASK_WINDOW_MS ?? '60000');
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // 启动时确保种子存在（幂等）
  try {
    seedResidents(app.db);
  } catch {
    // 忽略（已有数据）
  }

  await registerAuthRoutes(app);
  await registerEventsStream(app);

  // POST /api/loop 开始/重开轮回（需登录）
  app.post('/api/loop', async (req) => {
    return startNewLoop(app.db, req.playerId);
  });

  // POST /api/ask 审问（zod 校验 body + 按玩家限流）
  app.post(
    '/api/ask',
    { schema: { body: AskBody } },
    async (req: FastifyRequest<{ Body: z.infer<typeof AskBody> }>, reply: FastifyReply) => {
      const { loop_id, resident_id, question } = req.body;
      // 按玩家限流：防单玩家刷爆
      if (!rateLimit(`ask:${req.playerId}`, askRateMax(), askRateWindow())) {
        return reply
          .code(429)
          .send({ error: { code: 'RATE_LIMITED', message: '提问过快，请稍后再试' } });
      }
      try {
        return await askQuestion(app.db, req.playerId, loop_id, resident_id, question);
      } catch (err) {
        const e = toError(err);
        return reply.code(e.http).send({ error: { code: e.code, message: e.message } });
      }
    },
  );

  // POST /api/loop/:id/choice 关键选择（zod 校验 params + body）
  app.post(
    '/api/loop/:id/choice',
    { schema: { params: LoopIdParams, body: ChoiceBody } },
    async (
      req: FastifyRequest<{ Params: z.infer<typeof LoopIdParams>; Body: z.infer<typeof ChoiceBody> }>,
      reply: FastifyReply,
    ) => {
      const loopId = Number(req.params.id);
      try {
        return makeChoice(app.db, req.playerId, loopId, req.body.choice);
      } catch (err) {
        const e = toError(err);
        return reply.code(e.http).send({ error: { code: e.code, message: e.message } });
      }
    },
  );

  // GET /api/memory 玩家记忆（本玩家）
  app.get('/api/memory', async (req) => ({ memories: playerMemory(app.db, req.playerId) }));

  // GET /api/health 健康检查（公开）
  app.get('/api/health', { config: { public: true } }, async () => ({
    status: 'ok',
    service: 'lunhui-dukou',
  }));
}