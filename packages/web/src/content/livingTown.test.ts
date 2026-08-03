import { describe, it, expect } from 'vitest';
import {
  livingTownResidents,
  residentSecrets,
  residentRelations,
  loopEvents,
  memoryRevenge,
  type LoopEventTrigger,
} from './livingTown';

const VALID_TRIGGERS: LoopEventTrigger[] = ['loop-start', 'fact-hit', 'death', 'choice'];

describe('活镇内容数据模块', () => {
  it('livingTownResidents 至少 8 位且复用既有 id', () => {
    expect(livingTownResidents.length).toBeGreaterThanOrEqual(8);
    // 每位居民都应携带 id 与 name（复用 web residents.ts 字段）
    for (const r of livingTownResidents) {
      expect(r.id).toMatch(/^r\d+$/);
      expect(typeof r.name).toBe('string');
      expect(r.name.length).toBeGreaterThan(0);
    }
  });

  it('residentSecrets 为每位居民恰好提供一条秘密', () => {
    const ids = livingTownResidents.map((r) => r.id);
    // 每人至少一条
    for (const id of ids) {
      const owned = residentSecrets.filter((s) => s.id === `secret-${id}`);
      expect(owned.length, `居民 ${id} 应有一条 secret-${id}`).toBeGreaterThanOrEqual(1);
    }
    // secret id 唯一、无重复
    const secretIds = residentSecrets.map((s) => s.id);
    expect(new Set(secretIds).size).toBe(secretIds.length);
    // 每条 secret 必须呼应 engine factId（hint 中标注 r<id>:f<n>）
    for (const s of residentSecrets) {
      expect(s.hint).toMatch(/r\d+:f\d+/);
    }
  });

  it('residentRelations 关系网左右端点均为已知居民', () => {
    const idSet = new Set(livingTownResidents.map((r) => r.id));
    for (const rel of residentRelations) {
      expect(idSet.has(rel.from), `未知 from: ${rel.from}`).toBe(true);
      expect(idSet.has(rel.to), `未知 to: ${rel.to}`).toBe(true);
      expect(['ally', 'rival', 'kin', 'debt']).toContain(rel.kind);
    }
  });

  it('loopEvents 至少 3 条且 trigger 取值合法', () => {
    expect(loopEvents.length).toBeGreaterThanOrEqual(3);
    for (const ev of loopEvents) {
      expect(VALID_TRIGGERS).toContain(ev.trigger);
      expect(typeof ev.text).toBe('string');
      expect(ev.text.length).toBeGreaterThan(0);
    }
  });

  it('memoryRevenge 提供跨轮回记忆复仇台词且呼应 factId', () => {
    expect(memoryRevenge.length).toBeGreaterThanOrEqual(2);
    for (const m of memoryRevenge) {
      expect(m.factId).toMatch(/r\d+:f\d+/);
      expect(typeof m.line).toBe('string');
      expect(m.line.length).toBeGreaterThan(0);
    }
  });
});
