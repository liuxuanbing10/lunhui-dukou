import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

before(async () => {
  // 内存库：buildApp 默认用 DB_PATH，测试前用 :memory: 需要设置 env
  process.env.DB_PATH = ':memory:';
  app = buildApp();
  await app.ready();
});

after(async () => {
  await app.close();
});

test('GET /api/health', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { status: 'ok', service: 'lunhui-dukou' });
});

test('完整链路：开始轮回 → 审问命中 → 额度 → 选择 → 结束', async () => {
  // 1. 开始轮回
  const loopRes = await app.inject({ method: 'POST', url: '/api/loop', payload: {} });
  assert.equal(loopRes.statusCode, 200);
  const loop = loopRes.json();
  assert.equal(loop.questionsLeft, 10);
  assert.equal(loop.activeResidents.length, 8);

  // 2. 审问命中关键事实（蓑衣人）
  const askRes = await app.inject({
    method: 'POST',
    url: '/api/ask',
    payload: { loop_id: loop.loopId, resident_id: 'r1', question: '你捞过我吗？' },
  });
  assert.equal(askRes.statusCode, 200);
  const ask = askRes.json();
  assert.equal(ask.pause, true);
  assert.equal(ask.hitFactId, 'f1');
  assert.equal(ask.questionsLeft, 9);

  // 3. 未命中 → 保守回答
  const ask2 = await app.inject({
    method: 'POST',
    url: '/api/ask',
    payload: { loop_id: loop.loopId, resident_id: 'r2', question: '你喜欢什么花？' },
  });
  assert.equal(ask2.statusCode, 200);
  assert.equal(ask2.json().usedLlm, false);

  // 4. 未知居民 → 404
  const badRes = await app.inject({
    method: 'POST',
    url: '/api/ask',
    payload: { loop_id: loop.loopId, resident_id: 'r99', question: '你好' },
  });
  assert.equal(badRes.statusCode, 404);
  assert.equal(badRes.json().error.code, 'RESIDENT_NOT_ACTIVE');

  // 5. 选择 → 结束
  const choiceRes = await app.inject({
    method: 'POST',
    url: `/api/loop/${loop.loopId}/choice`,
    payload: { choice: 'leave' },
  });
  assert.equal(choiceRes.statusCode, 200);
  assert.equal(choiceRes.json().loopStatus, 'ended');

  // 6. 结束后再问 → LOOP_ENDED 409
  const endedAsk = await app.inject({
    method: 'POST',
    url: '/api/ask',
    payload: { loop_id: loop.loopId, resident_id: 'r1', question: '你好' },
  });
  assert.equal(endedAsk.statusCode, 409);
});

test('额度用尽 → 403 NO_QUESTIONS_LEFT', async () => {
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
  assert.equal(over.statusCode, 403);
  assert.equal(over.json().error.code, 'NO_QUESTIONS_LEFT');
});

test('记忆：关键命中后可查', async () => {
  const loopRes = await app.inject({ method: 'POST', url: '/api/loop', payload: {} });
  const loop = loopRes.json();
  await app.inject({
    method: 'POST',
    url: '/api/ask',
    payload: { loop_id: loop.loopId, resident_id: 'r8', question: '你怎么知道我的名字？' },
  });
  const memRes = await app.inject({ method: 'GET', url: '/api/memory' });
  assert.equal(memRes.statusCode, 200);
  const { memories } = memRes.json();
  assert.ok(memories.some((m: { content: string }) => m.content.includes('小满提到')));
});

test('参数缺失 → 400', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/ask', payload: {} });
  assert.equal(res.statusCode, 400);
});
