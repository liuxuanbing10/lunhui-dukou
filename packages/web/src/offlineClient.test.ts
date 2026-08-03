import { describe, it, expect } from 'vitest';
import { offlineApi } from './offlineClient';
import { loopEvents } from './content/livingTown';
import type { AnswerMode } from '@lunhui/engine/types';
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
    // 类型级绑定：AnswerMode 扩展时此处编译失败，杜绝手抄漂移
    expect(['direct', 'deny', 'silence', 'rhetoric'] as AnswerMode[]).toContain(res.answerMode);
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

  it('loopEvents 驱动开场：startLoop.intro 取 loop-start 事件文本', async () => {
    const loop = await offlineApi.startLoop();
    const loopStart = loopEvents.find((e) => e.trigger === 'loop-start');
    expect(loop.intro).toBe(loopStart?.text);
  });

  it('命中 r1 捞过7次 → 全局 factId 命中 memoryRevenge，跨轮回记忆注入', async () => {
    await offlineApi.startLoop();
    // engine 返回的是局部 factId（f1），非 livingTown 的全局 r1:f1
    const res = await offlineApi.ask(1, 'r1', '你捞过我几次？');
    expect(res.hitFactId).toBe('f1');
    expect(res.pause).toBe(true);
    const mem = await offlineApi.memory();
    // offlineClient 内部把局部 f1 拼成全局 r1:f1，匹配 memoryRevenge → 记忆回响注入
    expect(mem.memories.some((m) => m.content.includes('捞过你七次'))).toBe(true);
  });

  it('3:17 命中钉死：r5 何叔 f2 + pause=true，memory 含 r5:f2 钟停闪回文案', async () => {
    await offlineApi.startLoop();
    const res = await offlineApi.ask(1, 'r5', '钟停在 3:17 是为什么？');
    expect(res.hitFactId).toBe('f2'); // 钉死局部 factId 格式
    expect(res.pause).toBe(true);
    const mem = await offlineApi.memory();
    // loopEvents 中 factId='r5:f2' 的 fact-hit 叙事被拼入当场回答
    expect(res.answer).toContain('从水里被同一个人捞起来');
    // 关键事实的记忆回响（pause 分支）也入库
    expect(mem.memories.some((m) => m.content.includes('从水里被同一个人捞起来'))).toBe(true);
  });

  it('非关键事实复仇可达（阻塞修复验证）：r5 何叔 f3 + pause=false，memory 含 r5:f3 复仇台词', async () => {
    await offlineApi.startLoop();
    // 何叔 f3「记得每一次重复」是 isKey:false → pause=false，过去被 pause 门控误杀，现应可达
    const res = await offlineApi.ask(1, 'r5', '你是不是都记得？');
    expect(res.hitFactId).toBe('f3');
    expect(res.pause).toBe(false);
    const mem = await offlineApi.memory();
    // memoryRevenge 中 factId='r5:f3' 的跨轮回复仇台词：命中即触发（解耦 pause）
    expect(mem.memories.some((m) => m.content.includes('已经替你记了三十遍'))).toBe(true);
  });

  it('未命中不注入任何复仇/记忆台词', async () => {
    await offlineApi.startLoop();
    const res = await offlineApi.ask(1, 'r1', '今天天气真不错');
    expect(res.hitFactId).toBeUndefined();
    const mem = await offlineApi.memory();
    expect(mem.memories.some((m) => m.content.includes('捞过你七次'))).toBe(false);
    expect(mem.memories.some((m) => m.content.includes('已经替你记了三十遍'))).toBe(false);
  });
});
