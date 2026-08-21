import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

/** 注册一个本地用户，返回 { token, playerId } */
async function registerLocal(username: string): Promise<{ token: string; playerId: number }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { username, password: 'secret123' },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json<{ token: string; playerId: number }>();
  return { token: body.token, playerId: body.playerId };
}

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

beforeAll(async () => {
  // 内存库 + 调高限流水位，避免公共流程测试互相干扰
  process.env.DB_PATH = ':memory:';
  process.env.RATE_LIMIT_ASK_MAX = '1000';
  process.env.RATE_LIMIT_ASK_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_LOGIN_MAX = '1000';
  process.env.RATE_LIMIT_LLM_MAX = '1000';
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('鉴权', () => {
  it('GET /api/health（公开，无需 token）', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', service: 'lunhui-dukou' });
  });

  it('注册 → 返回 token；登录 → 返回 token', async () => {
    const reg = await registerLocal('alice');
    expect(reg.token).toBeTruthy();

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'alice', password: 'secret123' },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().token).toBeTruthy();
  });

  it('登录：密码错误 → 401 INVALID_CREDENTIALS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'bob', password: 'wrong-pass' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('受保护路由无 token → 401 UNAUTHORIZED', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/loop', payload: {} });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });
});

describe('游戏主链路（登录态）', () => {
  it('完整链路：开始轮回 → 审问命中 → 额度 → 选择 → 结束', async () => {
    const { token } = await registerLocal('flow-user');

    // 1. 开始轮回
    const loopRes = await app.inject({
      method: 'POST',
      url: '/api/loop',
      payload: {},
      headers: auth(token),
    });
    expect(loopRes.statusCode).toBe(200);
    const loop = loopRes.json();
    expect(loop.questionsLeft).toBe(10);
    expect(loop.activeResidents.length).toBe(8);

    // 2. 审问命中关键事实（蓑衣人）
    const askRes = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r1', question: '你捞过我吗？' },
      headers: auth(token),
    });
    expect(askRes.statusCode).toBe(200);
    const ask = askRes.json();
    expect(ask.pause).toBe(true);
    expect(ask.hitFactId).toBe('f1');
    expect(ask.questionsLeft).toBe(9);

    // 3. 未命中 → LLM 生成（mock 下 usedLlm=true）
    const ask2 = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r2', question: '你喜欢什么花？' },
      headers: auth(token),
    });
    expect(ask2.statusCode).toBe(200);
    expect(ask2.json().usedLlm).toBe(true);
    expect(ask2.json().answer.length > 0).toBeTruthy();

    // 4. 未知居民 → 404
    const badRes = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r99', question: '你好' },
      headers: auth(token),
    });
    expect(badRes.statusCode).toBe(404);
    expect(badRes.json().error.code).toBe('RESIDENT_NOT_ACTIVE');

    // 5. 选择 → 结束
    const choiceRes = await app.inject({
      method: 'POST',
      url: `/api/loop/${loop.loopId}/choice`,
      payload: { choice: 'leave' },
      headers: auth(token),
    });
    expect(choiceRes.statusCode).toBe(200);
    expect(choiceRes.json().loopStatus).toBe('ended');

    // 6. 结束后再问 → LOOP_ENDED 409
    const endedAsk = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r1', question: '你好' },
      headers: auth(token),
    });
    expect(endedAsk.statusCode).toBe(409);
  });

  it('额度用尽 → 403 NO_QUESTIONS_LEFT', async () => {
    const { token } = await registerLocal('quota-user');
    const loopRes = await app.inject({
      method: 'POST',
      url: '/api/loop',
      payload: {},
      headers: auth(token),
    });
    const loop = loopRes.json();
    for (let i = 0; i < 10; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/ask',
        payload: { loop_id: loop.loopId, resident_id: 'r3', question: `问题${i}` },
        headers: auth(token),
      });
    }
    const over = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r3', question: '第 11 问' },
      headers: auth(token),
    });
    expect(over.statusCode).toBe(403);
    expect(over.json().error.code).toBe('NO_QUESTIONS_LEFT');
  });

  it('记忆：关键命中后可查（仅本玩家）', async () => {
    const a = await registerLocal('mem-a');
    const loopRes = await app.inject({
      method: 'POST',
      url: '/api/loop',
      payload: {},
      headers: auth(a.token),
    });
    const loop = loopRes.json();
    await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loop.loopId, resident_id: 'r8', question: '你怎么知道我的名字？' },
      headers: auth(a.token),
    });
    const memRes = await app.inject({
      method: 'GET',
      url: '/api/memory',
      headers: auth(a.token),
    });
    expect(memRes.statusCode).toBe(200);
    const { memories } = memRes.json<{ memories: Array<{ content: string }> }>();
    expect(memories.some((m) => m.content.includes('小满提到'))).toBeTruthy();

    // B 看不到 A 的记忆
    const b = await registerLocal('mem-b');
    const memB = await app.inject({
      method: 'GET',
      url: '/api/memory',
      headers: auth(b.token),
    });
    expect((memB.json<{ memories: unknown[] }>().memories).length).toBe(0);
  });

  it('玩家隔离：B 无法操作 A 的轮回（404 LOOP_NOT_FOUND）', async () => {
    const a = await registerLocal('iso-a');
    const b = await registerLocal('iso-b');
    const loopRes = await app.inject({
      method: 'POST',
      url: '/api/loop',
      payload: {},
      headers: auth(a.token),
    });
    const loopId = loopRes.json().loopId;

    const cross = await app.inject({
      method: 'POST',
      url: '/api/ask',
      payload: { loop_id: loopId, resident_id: 'r1', question: '你好' },
      headers: auth(b.token),
    });
    expect(cross.statusCode).toBe(404);
    expect(cross.json().error.code).toBe('LOOP_NOT_FOUND');
  });
});

describe('限流', () => {
  it('/api/ask 按玩家限流：超限 → 429 RATE_LIMITED', async () => {
    const { token } = await registerLocal('ratelimited-user');
    const prev = process.env.RATE_LIMIT_ASK_MAX;
    process.env.RATE_LIMIT_ASK_MAX = '2';
    try {
      const loopRes = await app.inject({
        method: 'POST',
        url: '/api/loop',
        payload: {},
        headers: auth(token),
      });
      const loopId = loopRes.json().loopId;
      // 前 2 次放行
      for (let i = 0; i < 2; i++) {
        const ok = await app.inject({
          method: 'POST',
          url: '/api/ask',
          payload: { loop_id: loopId, resident_id: 'r1', question: `限流${i}` },
          headers: auth(token),
        });
        expect(ok.statusCode).toBe(200);
      }
      // 第 3 次被限流
      const limited = await app.inject({
        method: 'POST',
        url: '/api/ask',
        payload: { loop_id: loopId, resident_id: 'r1', question: '第 3 次' },
        headers: auth(token),
      });
      expect(limited.statusCode).toBe(429);
      expect(limited.json().error.code).toBe('RATE_LIMITED');
    } finally {
      if (prev === undefined) delete process.env.RATE_LIMIT_ASK_MAX;
      else process.env.RATE_LIMIT_ASK_MAX = prev;
    }
  });
});

describe('参数校验', () => {
  it('参数缺失 → 400', async () => {
    const { token } = await registerLocal('validate-user');
    const res = await app.inject({ method: 'POST', url: '/api/ask', payload: {}, headers: auth(token) });
    expect(res.statusCode).toBe(400);
  });
});