/**
 * API 路由（对齐 docs/API_CONTRACT.md）
 * 请求体/参数校验：zod via fastify-type-provider-zod（替代手写 typeof 校验）
 * 错误统一形状：{ error: { code, message } }
 */
import { z } from 'zod';
import { seedResidents } from '../db/seed.js';
import {
  askQuestion,
  makeChoice,
  playerMemory,
  startNewLoop,
} from '../services/loop-service.js';
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from 'fastify';

const ERROR_HTTP: Record<string, number> = {
  NO_QUESTIONS_LEFT: 403,
  LOOP_NOT_FOUND: 404,
  RESIDENT_NOT_ACTIVE: 404,
  LOOP_ENDED: 409,
};

function toError(err: unknown): { code: string; message: string; http: number } {
  const msg = err instanceof Error ? err.message : 'UNKNOWN';
  const http = ERROR_HTTP[msg] ?? 500;
  return { code: msg, message: msg, http };
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

// ---- Routes ----

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // 启动时确保种子存在（幂等）
  try {
    seedResidents(app.db);
  } catch {
    // 忽略（已有数据）
  }

  // POST /api/loop 开始/重开轮回
  app.post('/api/loop', async () => {
    const loop = startNewLoop(app.db);
    return loop;
  });

  // POST /api/ask 审问（zod 校验 body）
  app.post(
    '/api/ask',
    { schema: { body: AskBody } },
    async (req: FastifyRequest<{ Body: z.infer<typeof AskBody> }>, reply: FastifyReply) => {
      const { loop_id, resident_id, question } = req.body;
      try {
        const result = await askQuestion(loop_id, resident_id, question, app.db);
        return result;
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
        return makeChoice(loopId, req.body.choice, app.db);
      } catch (err) {
        const e = toError(err);
        return reply.code(e.http).send({ error: { code: e.code, message: e.message } });
      }
    },
  );

  // GET /api/memory 玩家记忆
  app.get('/api/memory', async () => ({ memories: playerMemory(app.db) }));

  // GET /api/health 健康检查
  app.get('/api/health', async () => ({ status: 'ok', service: 'lunhui-dukou' }));
}
