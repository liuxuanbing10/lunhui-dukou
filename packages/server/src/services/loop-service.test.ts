import { describe, it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { initDb, closeDb } from '../db/index.js';
import { seedResidents } from '../db/seed.js';
import { createPlayer } from '../db/repository.js';
import {
  startNewLoop,
  askQuestion,
  makeChoice,
  playerMemory,
  MAX_QUESTIONS,
} from './loop-service.js';
import { getLoop, countQuestionsInLoop } from '../db/repository.js';

let db: Database.Database;
let playerId: number;

beforeEach(() => {
  closeDb();
  db = initDb(':memory:');
  seedResidents(db);
  playerId = createPlayer(db, 'tester', 'salt:hash');
});

describe('loop-service', () => {
  it('开始轮回：intro/额度/居民全出', () => {
    const loop = startNewLoop(db, playerId);
    expect(loop.questionsLeft).toBe(MAX_QUESTIONS);
    expect(loop.activeResidents.length).toBe(8);
    expect(loop.intro.includes('9 个')).toBeTruthy();
    expect(loop.events.length >= 4).toBe(true);
  });

  it('审问：命中真相表 → direct + pause + 额度扣减', async () => {
    const loop = startNewLoop(db, playerId);
    const res = await askQuestion(db, playerId, loop.loopId, 'r1', '你捞过我吗？');
    expect(res.answerMode).toBe('direct');
    expect(res.pause).toBe(true);
    expect(res.hitFactId).toBe('f1');
    expect(res.questionsLeft).toBe(MAX_QUESTIONS - 1);
  });

  it('审问：未命中 → LLM 血肉层生成（sophnet）', async () => {
    const loop = startNewLoop(db, playerId);
    const res = await askQuestion(db, playerId, loop.loopId, 'r1', '你今天看到什么奇怪的事吗？');
    // 接了 LLM 后，未命中走 sophnet 生成（usedLlm=true）
    expect(res.usedLlm).toBe(true);
    expect(res.answer.length > 0).toBeTruthy();
    expect(!res.answer.includes('作为AI') && !res.answer.includes('我是模型')).toBeTruthy();
  });

  it('审问：引导问题 → 指向蓑衣人（Phase1 剧情引导）', async () => {
    const loop = startNewLoop(db, playerId);
    const res = await askQuestion(db, playerId, loop.loopId, 'r3', '多出来的那个人是谁？');
    expect(res.usedLlm).toBe(false);
    expect(res.answer.includes('渡口'), '老王应指向渡口').toBeTruthy();
  });

  it('审问：问蓑衣人引导问题 → 不给自指线索', async () => {
    const loop = startNewLoop(db, playerId);
    const res = await askQuestion(db, playerId, loop.loopId, 'r1', '多出来的是谁？');
    // 引导问题只对其他居民生效；蓑衣人走 LLM 生成，但不该揭自己底
    expect(res.hitFactId).toBe(undefined);
  });

  it('审问：额度用尽 → NO_QUESTIONS_LEFT', async () => {
    const loop = startNewLoop(db, playerId);
    for (let i = 0; i < MAX_QUESTIONS; i++) {
      await askQuestion(db, playerId, loop.loopId, 'r1', `问题${i}`);
    }
    await expect(
      askQuestion(db, playerId, loop.loopId, 'r1', '第 11 问'),
    ).rejects.toThrowError(/^NO_QUESTIONS_LEFT$/);
    expect(countQuestionsInLoop(db, playerId, loop.loopId)).toBe(MAX_QUESTIONS);
  });

  it('审问：居民未出场 → RESIDENT_NOT_ACTIVE', async () => {
    const loop = startNewLoop(db, playerId);
    // 手工把 r1 设为 inactive
    db.prepare('UPDATE residents SET is_active = 0 WHERE id = ?').run('r1');
    await expect(
      askQuestion(db, playerId, loop.loopId, 'r1', '你好'),
    ).rejects.toThrowError(/^RESIDENT_NOT_ACTIVE$/);
  });

  it('选择：结束轮回 + 后果写入', () => {
    const loop = startNewLoop(db, playerId);
    const res = makeChoice(db, playerId, loop.loopId, 'leave');
    expect(res.loopStatus).toBe('ended');
    expect(res.consequence.includes('第七次')).toBeTruthy();
    expect(getLoop(db, playerId, loop.loopId)?.status).toBe('ended');
  });

  it('轮回：关键命中写入记忆，玩家可查', async () => {
    const loop = startNewLoop(db, playerId);
    await askQuestion(db, playerId, loop.loopId, 'r1', '你捞过我吗？');
    const mems = playerMemory(db, playerId);
    expect(mems.some((m) => (m.content as string).includes('蓑衣人提到'))).toBeTruthy();
  });

  it('轮回：二次轮回时非永久记忆衰减', async () => {
    const loop1 = startNewLoop(db, playerId);
    await askQuestion(db, playerId, loop1.loopId, 'r1', '你捞过我吗？');
    makeChoice(db, playerId, loop1.loopId, 'leave');

    const loop2 = startNewLoop(db, playerId);
    expect(loop2.sequence).toBe(2);
    const mems = playerMemory(db, playerId);
    // 衰减一次后 strength 0.8
    expect(mems.some((m) => (m.strength as number) < 1)).toBeTruthy();
  });

  it('未知居民 id → RESIDENT_NOT_ACTIVE', async () => {
    const loop = startNewLoop(db, playerId);
    await expect(
      askQuestion(db, playerId, loop.loopId, 'r99', '你好'),
    ).rejects.toThrowError(/^RESIDENT_NOT_ACTIVE$/);
  });

  it('玩家隔离：B 玩家额度与记忆互不串（Phase1 验收核心）', async () => {
    const playerB = createPlayer(db, 'bob', 'salt:hash');

    // A：开始轮回，先命中真相表写入一条 A 专属记忆，再把额度问完
    const loopA = startNewLoop(db, playerId);
    await askQuestion(db, playerId, loopA.loopId, 'r1', '你捞过我吗？'); // 命中 f1 写入记忆
    for (let i = 0; i < MAX_QUESTIONS - 1; i++) {
      await askQuestion(db, playerId, loopA.loopId, 'r2', `A 问${i}`);
    }
    // A 用尽 → NO_QUESTIONS_LEFT
    await expect(
      askQuestion(db, playerId, loopA.loopId, 'r2', '第 11 问'),
    ).rejects.toThrowError(/^NO_QUESTIONS_LEFT$/);
    // A 自己有记忆
    expect(playerMemory(db, playerId).length).toBeGreaterThanOrEqual(1);

    // B 提问前：看不到 A 的任何记忆（隔离）
    expect(playerMemory(db, playerB).length).toBe(0);

    // B：全新额度，可正常开局与命中
    const loopB = startNewLoop(db, playerB);
    const res = await askQuestion(db, playerB, loopB.loopId, 'r1', '你捞过我吗？');
    expect(res.questionsLeft).toBe(MAX_QUESTIONS - 1);

    // B 无法操作 A 的 loop（越权被挡）
    await expect(
      askQuestion(db, playerB, loopA.loopId, 'r1', '你好'),
    ).rejects.toThrowError(/^LOOP_NOT_FOUND$/);
  });
});