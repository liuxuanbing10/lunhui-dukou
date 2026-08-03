import { describe, it, expect, beforeEach } from 'vitest';
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

describe('loop-service', () => {
  it('开始轮回：intro/额度/居民全出', () => {
    const loop = startNewLoop(db);
    expect(loop.questionsLeft).toBe(MAX_QUESTIONS);
    expect(loop.activeResidents.length).toBe(8);
    expect(loop.intro.includes('9 个')).toBeTruthy();
    expect(loop.events.length >= 4).toBe(true);
  });

  it('审问：命中真相表 → direct + pause + 额度扣减', async () => {
    const loop = startNewLoop(db);
    const res = await askQuestion(loop.loopId, 'r1', '你捞过我吗？', db);
    expect(res.answerMode).toBe('direct');
    expect(res.pause).toBe(true);
    expect(res.hitFactId).toBe('f1');
    expect(res.questionsLeft).toBe(MAX_QUESTIONS - 1);
  });

  it('审问：未命中 → LLM 血肉层生成（sophnet）', async () => {
    const loop = startNewLoop(db);
    const res = await askQuestion(loop.loopId, 'r1', '你今天看到什么奇怪的事吗？', db);
    // 接了 LLM 后，未命中走 sophnet 生成（usedLlm=true）
    expect(res.usedLlm).toBe(true);
    expect(res.answer.length > 0).toBeTruthy();
    expect(!res.answer.includes('作为AI') && !res.answer.includes('我是模型')).toBeTruthy();
  });

  it('审问：引导问题 → 指向蓑衣人（Phase1 剧情引导）', async () => {
    const loop = startNewLoop(db);
    const res = await askQuestion(loop.loopId, 'r3', '多出来的那个人是谁？', db);
    expect(res.usedLlm).toBe(false);
    expect(res.answer.includes('渡口'), '老王应指向渡口').toBeTruthy();
  });

  it('审问：问蓑衣人引导问题 → 不给自指线索', async () => {
    const loop = startNewLoop(db);
    const res = await askQuestion(loop.loopId, 'r1', '多出来的是谁？', db);
    // 引导问题只对其他居民生效；蓑衣人走 LLM 生成，但不该揭自己底
    expect(res.hitFactId).toBe(undefined);
  });

  it('审问：额度用尽 → NO_QUESTIONS_LEFT', async () => {
    const loop = startNewLoop(db);
    for (let i = 0; i < MAX_QUESTIONS; i++) {
      await askQuestion(loop.loopId, 'r1', `问题${i}`, db);
    }
    await expect(askQuestion(loop.loopId, 'r1', '第 11 问', db)).rejects.toThrowError(/^NO_QUESTIONS_LEFT$/);
    expect(countQuestionsInLoop(db, loop.loopId)).toBe(MAX_QUESTIONS);
  });

  it('审问：居民未出场 → RESIDENT_NOT_ACTIVE', async () => {
    const loop = startNewLoop(db);
    // 手工把 r1 设为 inactive
    db.prepare('UPDATE residents SET is_active = 0 WHERE id = ?').run('r1');
    await expect(askQuestion(loop.loopId, 'r1', '你好', db)    ).rejects.toThrowError(/^RESIDENT_NOT_ACTIVE$/);
  });

  it('选择：结束轮回 + 后果写入', () => {
    const loop = startNewLoop(db);
    const res = makeChoice(loop.loopId, 'leave', db);
    expect(res.loopStatus).toBe('ended');
    expect(res.consequence.includes('第七次')).toBeTruthy();
    expect(getLoop(db, loop.loopId)?.status).toBe('ended');
  });

  it('轮回：关键命中写入记忆，玩家可查', async () => {
    const loop = startNewLoop(db);
    await askQuestion(loop.loopId, 'r1', '你捞过我吗？', db);
    const mems = playerMemory(db);
    expect(mems.some((m) => (m.content as string).includes('蓑衣人提到'))).toBeTruthy();
  });

  it('轮回：二次轮回时非永久记忆衰减', async () => {
    const loop1 = startNewLoop(db);
    await askQuestion(loop1.loopId, 'r1', '你捞过我吗？', db);
    makeChoice(loop1.loopId, 'leave', db);

    const loop2 = startNewLoop(db);
    expect(loop2.sequence).toBe(2);
    const mems = playerMemory(db);
    // 衰减一次后 strength 0.8
    expect(mems.some((m) => (m.strength as number) < 1)).toBeTruthy();
  });

  it('未知居民 id → RESIDENT_NOT_ACTIVE', async () => {
    const loop = startNewLoop(db);
    await expect(askQuestion(loop.loopId, 'r99', '你好', db)    ).rejects.toThrowError(/^RESIDENT_NOT_ACTIVE$/);
  });
});
