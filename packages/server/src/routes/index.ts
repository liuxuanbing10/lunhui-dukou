/**
 * API 路由（对齐 docs/API_CONTRACT.md）
 * 错误统一形状：{ error: { code, message } }
 */
import type { FastifyInstance } from 'fastify';
import { seedResidents } from '../db/seed.js';
import {
  askQuestion,
  makeChoice,
  playerMemory,
  startNewLoop,
} from '../services/loop-service.js';

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

  // POST /api/ask 审问
  app.post('/api/ask', async (req, reply) => {
    const body = req.body as { loop_id?: number; resident_id?: string; question?: string };
    if (typeof body.loop_id !== 'number' || typeof body.resident_id !== 'string' || typeof body.question !== 'string') {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'loop_id/resident_id/question 必填' } });
    }
    try {
      const result = await askQuestion(body.loop_id, body.resident_id, body.question, app.db);
      return result;
    } catch (err) {
      const e = toError(err);
      return reply.code(e.http).send({ error: { code: e.code, message: e.message } });
    }
  });

  // POST /api/loop/:id/choice 关键选择
  app.post('/api/loop/:id/choice', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { choice?: string };
    const loopId = Number(id);
    if (Number.isNaN(loopId) || typeof body.choice !== 'string') {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'id/choice 必填' } });
    }
    try {
      return makeChoice(loopId, body.choice, app.db);
    } catch (err) {
      const e = toError(err);
      return reply.code(e.http).send({ error: { code: e.code, message: e.message } });
    }
  });

  // GET /api/memory 玩家记忆
  app.get('/api/memory', async () => ({ memories: playerMemory(app.db) }));

  // GET /api/health 健康检查
  app.get('/api/health', async () => ({ status: 'ok', service: 'lunhui-dukou' }));
}
