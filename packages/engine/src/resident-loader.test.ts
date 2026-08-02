import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAllResidents, parseResidentFile } from './resident-loader.js';
import { matchFact } from './truth-table.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('加载全部居民：8 人，id 顺序 r1..r8', () => {
  const residents = loadAllResidents();
  assert.equal(residents.length, 8);
  assert.deepEqual(
    residents.map((r) => r.id),
    ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'],
  );
});

test('每个居民字段完整（真相表/关系网/人格）', () => {
  for (const r of loadAllResidents()) {
    assert.ok(r.name, `${r.id} 缺 name`);
    assert.ok(r.persona, `${r.id} 缺 persona`);
    assert.ok(r.secretFacts.facts.length >= 2, `${r.id} 真相表至少 2 条`);
    assert.ok(r.secretFacts.truth, `${r.id} 缺 truth`);
    assert.ok(Array.isArray(r.relations), `${r.id} relations 应为数组`);
    // 每个 fact 有 keywords（数据驱动判定依赖）
    for (const f of r.secretFacts.facts) {
      assert.ok(Array.isArray(f.keywords) && f.keywords!.length > 0, `${r.id}.${f.id} 缺 keywords`);
      assert.ok(f.isKey === true || f.isKey === false, `${r.id}.${f.id} isKey 非法`);
    }
  }
});

test('真实角色文件可判定：蓑衣人命中关键事实', () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../residents');
  const r1 = parseResidentFile(path.join(dir, 'r1-suoyi.md'));
  const m = matchFact('你捞过我吗？', r1);
  assert.equal(m.matched, true);
  assert.equal(m.fact?.id, 'f1');
  assert.equal(m.fact?.isKey, true);
});

test('真实角色文件可判定：小满命中关键事实', () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../residents');
  const r8 = parseResidentFile(path.join(dir, 'r8-xiaoman.md'));
  const m = matchFact('你怎么知道我的名字？', r8);
  assert.equal(m.matched, true);
  assert.equal(m.fact?.id, 'f1');
});
