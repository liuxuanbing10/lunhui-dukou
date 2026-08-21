import { describe, it, expect } from 'vitest';
import { matchFact, judgeAsk } from './truth-table.js';
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

describe('judgeAsk 判定（直接单测）', () => {
  const keyResident = makeResident([
    { id: 'f-key', keywords: ['号码'], isKey: true, statement: '号码是对的。' },
    { id: 'f-plain', keywords: ['天气'], isKey: false, statement: '今晚要下雨。' },
  ]);

  it('命中关键事实 → direct + pause + hitFactId（沉默三秒）', async () => {
    const r = await judgeAsk('号码是多少？', keyResident);
    expect(r.answerMode).toBe('direct');
    expect(r.pause).toBe(true);
    expect(r.hitFactId).toBe('f-key');
    expect(r.usedLlm).toBe(false);
    expect(r.answer).toContain('号码是对的');
  });

  it('命中普通事实 → direct、不暂停', async () => {
    const r = await judgeAsk('今晚天气怎么样？', keyResident);
    expect(r.answerMode).toBe('direct');
    expect(r.pause).toBe(false);
    expect(r.hitFactId).toBe('f-plain');
  });

  it('未命中 + fallback 返回纯文本 → rhetoric 且视为 LLM', async () => {
    const r = await judgeAsk('你好吗？', keyResident, async () => '我很好。');
    expect(r.answerMode).toBe('rhetoric');
    expect(r.pause).toBe(false);
    expect(r.answer).toBe('我很好。');
    expect(r.usedLlm).toBe(true);
  });

  it('未命中 + fallback 返回 {text,usedLlm:false} → rhetoric 且省 token', async () => {
    const r = await judgeAsk('你好吗？', keyResident, async () => ({ text: '保守回答。', usedLlm: false }));
    expect(r.usedLlm).toBe(false);
    expect(r.answer).toBe('保守回答。');
  });

  it('未命中且无 fallback → silence 兜底', async () => {
    const r = await judgeAsk('今天中午吃啥？', keyResident);
    expect(r.answerMode).toBe('silence');
    expect(r.pause).toBe(false);
    expect(r.usedLlm).toBe(false);
  });

  it('真相级试探词 → 不揭底，回退 silence（防被套出真相）', async () => {
    const r = await judgeAsk('你是谁？', keyResident);
    expect(r.answerMode).toBe('silence');
    expect(r.hitFactId).toBeUndefined();
  });
});
