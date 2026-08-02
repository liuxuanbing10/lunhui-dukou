import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeAsk, matchFact } from './truth-table.js';
import type { Resident } from './types.js';

/** 蓑衣人 fixture（对齐 docs/RESIDENTS.md r1，精简版） */
const suoyi: Resident = {
  id: 'r1',
  name: '蓑衣人',
  archetype: '沉默 · 话里有话',
  age: 48,
  role: '无固定营生，常在渡口',
  appearance: '破蓑衣，斗笠压得很低',
  persona: '话极少，每句都像秤砣。从不说谎，但只说一半。',
  speechStyle: '短句。偶尔用「捞」「水」「上次」。',
  quirks: [],
  secretFacts: {
    facts: [
      { id: 'f1', statement: '蓑衣人捞过你 7 次', isKey: true, keywords: ['捞过', '捞我', '7次', '七次'] },
      { id: 'f2', statement: '蓑衣人是面馆老王死去的弟弟', isKey: true, keywords: ['弟弟', '兄弟', '老王'] },
      { id: 'f3', statement: '蓑衣人每年涨水时来渡口', isKey: false, keywords: ['涨水', '每年'] },
    ],
    truth: '玩家已经死过 7 次，每次都是蓑衣人捞上来的。',
  },
  relations: [],
};

test('命中关键事实 → direct + pause', async () => {
  const res = await judgeAsk('你捞过我吗？', suoyi);
  assert.equal(res.answerMode, 'direct');
  assert.equal(res.pause, true);
  assert.equal(res.hitFactId, 'f1');
  assert.equal(res.usedLlm, false); // 纯规则，不烧钱
});

test('命中普通事实 → direct 但 pause=false', async () => {
  const res = await judgeAsk('你每年都来渡口吗？', suoyi);
  assert.equal(res.answerMode, 'direct');
  assert.equal(res.pause, false);
  assert.equal(res.hitFactId, 'f3');
});

test('未命中 → 走 LLM fallback（若提供）', async () => {
  const res = await judgeAsk('你喜欢吃面吗？', suoyi, async () => '（他看了你一眼：雨很大。）');
  assert.equal(res.usedLlm, true);
  assert.equal(res.answerMode, 'rhetoric');
  assert.equal(res.pause, false);
  assert.equal(res.hitFactId, undefined);
});

test('未命中且无 fallback → 保守沉默', async () => {
  const res = await judgeAsk('你喜欢吃面吗？', suoyi);
  assert.equal(res.answerMode, 'silence');
  assert.equal(res.usedLlm, false);
});

test('真相级试探 → 不揭底', async () => {
  const res = await judgeAsk('你到底是谁？', suoyi);
  assert.equal(res.answerMode, 'silence');
  assert.equal(res.hitFactId, undefined); // 不命中任何事实，不揭底
  assert.equal(res.usedLlm, false); // 由 matchFact 直接拦截
});

test('matchFact 返回最高分事实', () => {
  const m = matchFact('你是不是老王的弟弟？', suoyi);
  assert.equal(m.matched, true);
  assert.equal(m.fact?.id, 'f2');
});

test('无关问题不误命中', () => {
  const m = matchFact('今天的雨真大。', suoyi);
  assert.equal(m.matched, false);
});
