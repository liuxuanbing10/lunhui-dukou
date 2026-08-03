import { describe, it, expect } from 'vitest';
import { loadAllResidents, parseResidentFile } from './resident-loader.js';
import { matchFact } from './truth-table.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('resident-loader', () => {
  it('加载全部居民：8 人，id 顺序 r1..r8', () => {
    const residents = loadAllResidents();
    expect(residents.length).toBe(8);
    expect(
      residents.map((r) => r.id),
    ).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']);
  });

  it('每个居民字段完整（真相表/关系网/人格）', () => {
    for (const r of loadAllResidents()) {
      expect(r.name, `${r.id} 缺 name`).toBeTruthy();
      expect(r.persona, `${r.id} 缺 persona`).toBeTruthy();
      expect(r.secretFacts.facts.length >= 2, `${r.id} 真相表至少 2 条`).toBeTruthy();
      expect(r.secretFacts.truth, `${r.id} 缺 truth`).toBeTruthy();
      expect(Array.isArray(r.relations), `${r.id} relations 应为数组`).toBeTruthy();
      // 每个 fact 有 keywords（数据驱动判定依赖）
      for (const f of r.secretFacts.facts) {
        expect(Array.isArray(f.keywords) && f.keywords!.length > 0, `${r.id}.${f.id} 缺 keywords`).toBeTruthy();
        expect(f.isKey === true || f.isKey === false, `${r.id}.${f.id} isKey 非法`).toBeTruthy();
      }
    }
  });

  it('真实角色文件可判定：蓑衣人命中关键事实', () => {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../residents');
    const r1 = parseResidentFile(path.join(dir, 'r1-suoyi', 'SOUL.md'));
    const m = matchFact('你捞过我吗？', r1);
    expect(m.matched).toBe(true);
    expect(m.fact?.id).toBe('f1');
    expect(m.fact?.isKey).toBe(true);
  });

  it('真实角色文件可判定：小满命中关键事实', () => {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../residents');
    const r8 = parseResidentFile(path.join(dir, 'r8-xiaoman', 'SOUL.md'));
    const m = matchFact('你怎么知道我的名字？', r8);
    expect(m.matched).toBe(true);
    expect(m.fact?.id).toBe('f1');
  });
});
