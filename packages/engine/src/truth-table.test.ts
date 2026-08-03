import { describe, it, expect } from 'vitest';
import { matchFact } from './truth-table.js';
import type { Resident } from './types.js';

/**
 * 构造最小 Resident 用于匹配测试（matchFact 只消费 secretFacts.facts）。
 * 运行时（tsx）不做类型检查，结构对齐即可。
 */
function makeResident(facts: unknown[]): Resident {
  return {
    id: 'r-test',
    name: '测试居民',
    secretFacts: { facts },
  } as unknown as Resident;
}

describe('truth-table 匹配', () => {
  it('关键词含标点(如 3:17)在归一化后仍能命中', () => {
    const resident = makeResident([
      { id: 'f-heshu', keywords: ['3:17'], isKey: true, statement: '钟停在三点十七分。' },
    ]);
    const r = matchFact('钟怎么总停在 3:17？', resident);
    expect(r.matched).toBe(true);
    expect(r.fact?.id).toBe('f-heshu');
  });

  it('普通关键词命中（无标点）', () => {
    const resident = makeResident([
      { id: 'f-name', keywords: ['你的名字'], isKey: false, statement: '叫我阿渡。' },
    ]);
    const r = matchFact('你的名字是什么？', resident);
    expect(r.matched).toBe(true);
    expect(r.fact?.id).toBe('f-name');
  });

  it('未命中任何关键词返回 matched=false', () => {
    const resident = makeResident([
      { id: 'f-x', keywords: ['船票'], isKey: false, statement: '...' },
    ]);
    const r = matchFact('今天天气不错', resident);
    expect(r.matched).toBe(false);
  });
});
