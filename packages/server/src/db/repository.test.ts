import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
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

test('建表后种子导入：8 位居民', () => {
  const n = seedResidents(testDb);
  assert.equal(n, 8);
  assert.equal(getAllResidents(testDb).length, 8);
});

test('居民数据完整（真相表/关系网/人格）', () => {
  seedResidents(testDb);
  const rows = getAllResidents(testDb);
  for (const r of rows) {
    const facts = JSON.parse(r.secret_facts as string);
    assert.ok(facts.facts.length >= 2, `${r.id} 真相表至少 2 条`);
    assert.ok(facts.truth, `${r.id} 缺 truth`);
    assert.ok(Array.isArray(JSON.parse(r.relations as string)));
    assert.ok((r.persona as string).length > 0);
  }
});

test('loop 生命周期：创建→提问→结束', () => {
  seedResidents(testDb);
  const loopId = createLoop(testDb, 1);
  assert.equal(getLoop(testDb, loopId)?.status, 'active');

  addQuestion(testDb, loopId, 'r1', '你捞过我吗？', 'f1', '（蓑衣人停住了。蓑衣人捞过你 7 次）', 'direct', false);
  addQuestion(testDb, loopId, 'r2', '你等谁？', undefined, '（她沉默地看着你，没有回答。）', 'silence', false);
  assert.equal(countQuestionsInLoop(testDb, loopId), 2);

  endLoop(testDb, loopId, 'leave', '船在河心沉没');
  assert.equal(getLoop(testDb, loopId)?.status, 'ended');
  assert.equal(getLatestLoop(testDb)?.id, loopId);
});

test('记忆：添加/读取/衰减', () => {
  seedResidents(testDb);
  const loopId = createLoop(testDb, 1);
  addMemory(testDb, 'r1', loopId, '蓑衣人说捞过我', false);
  addMemory(testDb, 'r1', loopId, '蓑衣人每年涨水来渡口', true);

  let mems = getMemories(testDb, 'r1');
  assert.equal(mems.length, 2);

  // 衰减 3 次：非永久 1.0→0.8→0.64→0.512；永久不变
  for (let i = 0; i < 3; i++) decayMemories(testDb);
  mems = getMemories(testDb, 'r1');
  // 永久记忆仍在，非永久 0.512 仍 ≥0.3
  assert.equal(mems.length, 2);
  const perm = mems.find((m) => m.content === '蓑衣人每年涨水来渡口') as
    | Record<string, unknown>
    | undefined;
  assert.equal(perm?.strength, 1);

  // 再衰减 2 次：非永久 0.512→0.41→0.33（仍 ≥0.3）；再 1 次→0.26 <0.3 被过滤
  decayMemories(testDb);
  decayMemories(testDb);
  decayMemories(testDb);
  mems = getMemories(testDb, 'r1');
  assert.equal(mems.length, 1);
  assert.equal(mems[0]?.content, '蓑衣人每年涨水来渡口');
});

test('事件：添加/读取', () => {
  const loopId = createLoop(testDb, 1);
  addEvent(testDb, loopId, 'ambient', '雨声很大', false, false);
  addEvent(testDb, loopId, 'clue', '阿岚在渡口放白花', true, false);
  const events = getEvents(testDb, loopId);
  assert.equal(events.length, 2);
  assert.equal(events[1]?.is_clue, 1);
});

test('世界状态快照', () => {
  const loopId = createLoop(testDb, 1);
  saveWorldState(testDb, loopId, [{ a: 1 }], { key: 'v' }, ['r1', 'r2']);
  const db = getDb();
  const row = db.prepare('SELECT * FROM world_states WHERE loop_id = ?').get(loopId) as Record<
    string,
    unknown
  >;
  assert.deepEqual(JSON.parse(row.flags as string), { key: 'v' });
  assert.deepEqual(JSON.parse(row.active_residents as string), ['r1', 'r2']);
});

test('wipeAll 清空全部', () => {
  seedResidents(testDb);
  const loopId = createLoop(testDb, 1);
  addMemory(testDb, 'r1', loopId, 'x');
  wipeAll(testDb);
  assert.equal(getAllResidents(testDb).length, 0);
  assert.equal(getLoop(testDb, loopId), undefined);
});
