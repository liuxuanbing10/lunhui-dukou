import { describe, it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { initDb, closeDb, getDb } from './index.js';
import { seedResidents } from './seed.js';
import {
  getAllResidents,
  createLoop,
  getLoop,
  countQuestionsInLoop,
  addQuestion,
  addMemory,
  getMemories,
  getStrongMemories,
  decayMemories,
  addEvent,
  getEvents,
  wipeAll,
  endLoop,
  getLatestLoop,
  saveWorldState,
} from './repository.js';

let testDb: Database.Database;

beforeEach(() => {
  closeDb();
  // 内存库测试
  testDb = initDb(':memory:');
});

describe('repository', () => {
  it('建表后种子导入：8 位居民', () => {
    const n = seedResidents(testDb);
    expect(n).toBe(8);
    expect(getAllResidents(testDb).length).toBe(8);
  });

  it('居民数据完整（真相表/关系网/人格）', () => {
    seedResidents(testDb);
    const rows = getAllResidents(testDb);
    for (const r of rows) {
      const facts = JSON.parse(r.secret_facts as string);
      expect(facts.facts.length >= 2, `${r.id} 真相表至少 2 条`).toBeTruthy();
      expect(facts.truth, `${r.id} 缺 truth`).toBeTruthy();
      expect(Array.isArray(JSON.parse(r.relations as string))).toBeTruthy();
      expect((r.persona as string).length > 0).toBeTruthy();
    }
  });

  it('loop 生命周期：创建→提问→结束', () => {
    seedResidents(testDb);
    const loopId = createLoop(testDb, 1);
    expect(getLoop(testDb, loopId)?.status).toBe('active');

    addQuestion(testDb, loopId, 'r1', '你捞过我吗？', 'f1', '（蓑衣人停住了。蓑衣人捞过你 7 次）', 'direct', false);
    addQuestion(testDb, loopId, 'r2', '你等谁？', undefined, '（她沉默地看着你，没有回答。）', 'silence', false);
    expect(countQuestionsInLoop(testDb, loopId)).toBe(2);

    endLoop(testDb, loopId, 'leave', '船在河心沉没');
    expect(getLoop(testDb, loopId)?.status).toBe('ended');
    expect(getLatestLoop(testDb)?.id).toBe(loopId);
  });

  it('记忆：添加/读取/衰减', () => {
    seedResidents(testDb);
    const loopId = createLoop(testDb, 1);
    addMemory(testDb, 'r1', loopId, '蓑衣人说捞过我', false);
    addMemory(testDb, 'r1', loopId, '蓑衣人每年涨水来渡口', true);

    let mems = getMemories(testDb, 'r1');
    expect(mems.length).toBe(2);

    // 衰减 3 次：非永久 1.0→0.8→0.64→0.512；永久不变
    for (let i = 0; i < 3; i++) decayMemories(testDb);
    mems = getMemories(testDb, 'r1');
    // 永久记忆仍在，非永久 0.512 仍 ≥0.3
    expect(mems.length).toBe(2);
    const perm = mems.find((m) => m.content === '蓑衣人每年涨水来渡口') as
      | Record<string, unknown>
      | undefined;
    expect(perm?.strength).toBe(1);

    // 再衰减 2 次：非永久 0.512→0.41→0.33（仍 ≥0.3）；再 1 次→0.26 <0.3 被过滤
    decayMemories(testDb);
    decayMemories(testDb);
    decayMemories(testDb);
    mems = getMemories(testDb, 'r1');
    expect(mems.length).toBe(1);
    expect(mems[0]?.content).toBe('蓑衣人每年涨水来渡口');
  });

  it('事件：添加/读取', () => {
    const loopId = createLoop(testDb, 1);
    addEvent(testDb, loopId, 'ambient', '雨声很大', false, false);
    addEvent(testDb, loopId, 'clue', '阿岚在渡口放白花', true, false);
    const events = getEvents(testDb, loopId);
    expect(events.length).toBe(2);
    expect(events[1]?.is_clue).toBe(1);
  });

  it('世界状态快照', () => {
    const loopId = createLoop(testDb, 1);
    saveWorldState(testDb, loopId, [{ a: 1 }], { key: 'v' }, ['r1', 'r2']);
    const db = getDb();
    const row = db.prepare('SELECT * FROM world_states WHERE loop_id = ?').get(loopId) as Record<
      string,
      unknown
    >;
    expect(JSON.parse(row.flags as string)).toEqual({ key: 'v' });
    expect(JSON.parse(row.active_residents as string)).toEqual(['r1', 'r2']);
  });

  it('玩家强记忆：getStrongMemories（≥0.3、永久优先、≤20）', () => {
    seedResidents(testDb);
    const loopId = createLoop(testDb, 1);
    addMemory(testDb, 'r1', loopId, '永久记忆', true);
    addMemory(testDb, 'r2', loopId, '强记忆', false);
    // 手动制造一条弱记忆（strength 0.1 < 0.3 阈值，应被过滤）
    testDb.prepare('UPDATE memories SET strength = 0.1 WHERE content = ?').run('强记忆');
    addMemory(testDb, 'r3', loopId, '另一条强记忆', false);

    const strong = getStrongMemories(testDb);
    expect(strong.length).toBe(2);
    // 永久优先
    expect(strong[0]?.content).toBe('永久记忆');
    expect(strong.every((m) => m.strength >= 0.3)).toBe(true);
  });

  it('wipeAll 清空全部', () => {
    seedResidents(testDb);
    const loopId = createLoop(testDb, 1);
    addMemory(testDb, 'r1', loopId, 'x');
    wipeAll(testDb);
    expect(getAllResidents(testDb).length).toBe(0);
    expect(getLoop(testDb, loopId)).toBe(undefined);
  });
});
