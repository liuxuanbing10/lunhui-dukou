import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type Database from 'better-sqlite3';
import { initDb, closeDb } from '../db/index.js';
import { seedResidents } from '../db/seed.js';
import { startNewLoop, askQuestion, makeChoice, playerMemory, MAX_QUESTIONS } from '../services/loop-service.js';
import { getLoop, countQuestionsInLoop } from '../db/repository.js';

let db: Database.Database;

beforeEach(() => {
  closeDb();
  db = initDb(':memory:');
  seedResidents(db);
});

test('开始轮回：intro/额度/居民全出', () => {
  const loop = startNewLoop(db);
  assert.equal(loop.questionsLeft, MAX_QUESTIONS);
  assert.equal(loop.activeResidents.length, 8);
  assert.ok(loop.intro.includes('9 个'));
  assert.equal(loop.events.length >= 4, true);
});

test('审问：命中真相表 → direct + pause + 额度扣减', async () => {
  const loop = startNewLoop(db);
  const res = await askQuestion(loop.loopId, 'r1', '你捞过我吗？', db);
  assert.equal(res.answerMode, 'direct');
  assert.equal(res.pause, true);
  assert.equal(res.hitFactId, 'f1');
  assert.equal(res.questionsLeft, MAX_QUESTIONS - 1);
});

test('审问：未命中 → LLM 血肉层生成（sophnet）', async () => {
  const loop = startNewLoop(db);
  const res = await askQuestion(loop.loopId, 'r1', '你今天看到什么奇怪的事吗？', db);
  // 接了 LLM 后，未命中走 sophnet 生成（usedLlm=true）
  assert.equal(res.usedLlm, true);
  assert.ok(res.answer.length > 0);
  assert.ok(!res.answer.includes('作为AI') && !res.answer.includes('我是模型'));
});

test('审问：引导问题 → 指向蓑衣人（Phase1 剧情引导）', async () => {
  const loop = startNewLoop(db);
  const res = await askQuestion(loop.loopId, 'r3', '多出来的那个人是谁？', db);
  assert.equal(res.usedLlm, false);
  assert.ok(res.answer.includes('渡口'), '老王应指向渡口');
});

test('审问：问蓑衣人引导问题 → 不给自指线索', async () => {
  const loop = startNewLoop(db);
  const res = await askQuestion(loop.loopId, 'r1', '多出来的是谁？', db);
  // 引导问题只对其他居民生效；蓑衣人走 LLM 生成，但不该揭自己底
  assert.equal(res.hitFactId, undefined);
});

test('审问：额度用尽 → NO_QUESTIONS_LEFT', async () => {
  const loop = startNewLoop(db);
  for (let i = 0; i < MAX_QUESTIONS; i++) {
    await askQuestion(loop.loopId, 'r1', `问题${i}`, db);
  }
  await assert.rejects(
    () => askQuestion(loop.loopId, 'r1', '第 11 问', db),
    (err: Error) => err.message === 'NO_QUESTIONS_LEFT',
  );
  assert.equal(countQuestionsInLoop(db, loop.loopId), MAX_QUESTIONS);
});

test('审问：居民未出场 → RESIDENT_NOT_ACTIVE', async () => {
  const loop = startNewLoop(db);
  // 手工把 r1 设为 inactive
  db.prepare('UPDATE residents SET is_active = 0 WHERE id = ?').run('r1');
  await assert.rejects(
    () => askQuestion(loop.loopId, 'r1', '你好', db),
    (err: Error) => err.message === 'RESIDENT_NOT_ACTIVE',
  );
});

test('选择：结束轮回 + 后果写入', () => {
  const loop = startNewLoop(db);
  const res = makeChoice(loop.loopId, 'leave', db);
  assert.equal(res.loopStatus, 'ended');
  assert.ok(res.consequence.includes('第七次'));
  assert.equal(getLoop(db, loop.loopId)?.status, 'ended');
});

test('轮回：关键命中写入记忆，玩家可查', async () => {
  const loop = startNewLoop(db);
  await askQuestion(loop.loopId, 'r1', '你捞过我吗？', db);
  const mems = playerMemory(db);
  assert.ok(mems.some((m) => (m.content as string).includes('蓑衣人提到')));
});

test('轮回：二次轮回时非永久记忆衰减', async () => {
  const loop1 = startNewLoop(db);
  await askQuestion(loop1.loopId, 'r1', '你捞过我吗？', db);
  makeChoice(loop1.loopId, 'leave', db);

  const loop2 = startNewLoop(db);
  assert.equal(loop2.sequence, 2);
  const mems = playerMemory(db);
  // 衰减一次后 strength 0.8
  assert.ok(mems.some((m) => (m.strength as number) < 1));
});

test('未知居民 id → RESIDENT_NOT_ACTIVE', async () => {
  const loop = startNewLoop(db);
  await assert.rejects(
    () => askQuestion(loop.loopId, 'r99', '你好', db),
    (err: Error) => err.message === 'RESIDENT_NOT_ACTIVE',
  );
});
