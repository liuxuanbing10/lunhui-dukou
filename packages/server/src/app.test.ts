import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  // 内存库：buildApp 默认用 DB_PATH，测试前用 :memory: 需要设置 env
  process.env.DB_PATH = ':memory:';
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('app HTTP 接口', () => {
  it('GET /api/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', service: 'lunhui-dukou' });
  });

  it('完整链路：开始轮回 → 审问命中 → 额度 → 选择 → 结束', async () => {
    // 1. 开始轮回
    const loopRes = await app.inject({ method: 'POST', url: '/api/loop', payload: {} });
    expect(loopRes.statusCode).toBe(200);
    const loop = loopRes.json();
    expect(loop.questionsLeft).toBe(10);
    expect(loop.activeResidents.length).toBe(8);

    // 2. 审问命中关键事实（蓑衣人）
    const askRes = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r1', question: '你捞过我吗？' },
    });
    expect(askRes.statusCode).toBe(200);
    const ask = askRes.json();
    expect(ask.pause).toBe(true);
    expect(ask.hitFactId).toBe('f1');
    expect(ask.questionsLeft).toBe(9);

    // 3. 未命中 → LLM 生成（sophnet）
    const ask2 = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r2', question: '你喜欢什么花？' },
    });
    expect(ask2.statusCode).toBe(200);
    expect(ask2.json().usedLlm).toBe(true);
    expect(ask2.json().answer.length > 0).toBeTruthy();

    // 4. 未知居民 → 404
    const badRes = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r99', question: '你好' },
    });
    expect(badRes.statusCode).toBe(404);
    expect(badRes.json().error.code).toBe('RESIDENT_NOT_ACTIVE');

    // 5. 选择 → 结束
    const choiceRes = await app.inject({
      method: 'POST',
      url: `/api/loop/${loop.loopId}/choice`,
      payload: { choice: 'leave' },
    });
    expect(choiceRes.statusCode).toBe(200);
    expect(choiceRes.json().loopStatus).toBe('ended');

    // 6. 结束后再问 → LOOP_ENDED 409
    const endedAsk = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r1', question: '你好' },
    });
    expect(endedAsk.statusCode).toBe(409);
  });

  it('额度用尽 → 403 NO_QUESTIONS_LEFT', async () => {
    const loopRes = await app.inject({ method: 'POST', url: '/api/loop', payload: {} });
    const loop = loopRes.json();
    for (let i = 0; i < 10; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/ask',
        payload: { loop_id: loop.loopId, resident_id: 'r3', question: `问题${i}` },
      });
    }
    const over = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r3', question: '第 11 问' },
    });
    expect(over.statusCode).toBe(403);
    expect(over.json().error.code).toBe('NO_QUESTIONS_LEFT');
  });

  it('记忆：关键命中后可查', async () => {
    const loopRes = await app.inject({ method: 'POST', url: '/api/loop', payload: {} });
    const loop = loopRes.json();
    await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r8', question: '你怎么知道我的名字？' },
    });
    const memRes = await app.inject({ method: 'GET', url: '/api/memory' });
    expect(memRes.statusCode).toBe(200);
    const { memories } = memRes.json();
    expect(memories.some((m: { content: string }) => m.content.includes('小满提到'))).toBeTruthy();
  });

  it('参数缺失 → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/ask', payload: {} });
    expect(res.statusCode).toBe(400);
  });
});
