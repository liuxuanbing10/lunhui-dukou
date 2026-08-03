import { describe, it, expect } from 'vitest';
import { offlineApi } from './offlineClient';
import type { AskResponse } from './api';

describe('offlineClient 确定性判定（零 token / 零后端）', () => {
  it('命中 r5 何叔的 3:17 关键事实（hitFactId 非空，pause=true，不调 LLM）', async () => {
    // 与 api.ask 同形状：(loopId, residentId, question)
    const res = await offlineApi.ask(1, 'r5', '钟怎么总停在 3:17？');
    expect(res.hitFactId).toBeTruthy();
    expect(res.hitFactId).not.toBeUndefined();
    expect(res.pause).toBe(true);
    expect(res.answerMode).toBe('direct');
    expect(res.usedLlm).toBe(false);
  });

  it('未命中任何事实走保守兜底（不调 LLM）', async () => {
    const res = await offlineApi.ask(1, 'r1', '今天天气真不错');
    expect(res.hitFactId).toBeUndefined();
    expect(res.usedLlm).toBe(false);
    expect(res.answer).toContain('雨');
  });

  it('返回结构与 api（AskResponse）完全一致', async () => {
    const res = (await offlineApi.ask(1, 'r2', '你的名字是什么？')) as AskResponse;
    expect(typeof res.loopId).toBe('number');
    expect(typeof res.sequence).toBe('number');
    expect(typeof res.answer).toBe('string');
    expect(['direct', 'deny', 'silence', 'rhetoric']).toContain(res.answerMode);
    expect(typeof res.pause).toBe('boolean');
    expect(typeof res.questionsLeft).toBe('number');
    expect(typeof res.usedLlm).toBe('boolean');
  });

  it('startLoop / choice / memory 同形状且离线可玩', async () => {
    const loop = await offlineApi.startLoop();
    expect(loop.activeResidents.length).toBe(8);
    expect(loop.questionsLeft).toBe(10);
    const choice = await offlineApi.choice(1, 'leave');
    expect(choice.accepted).toBe(true);
    const mem = await offlineApi.memory();
    expect(Array.isArray(mem.memories)).toBe(true);
  });
});
