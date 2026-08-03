/**
 * offlineClient.ts — 离线判定客户端（零后端 / 零 LLM token）
 * ----------------------------------------------------------------------------
 * 复用 @lunhui/engine 的真相表纯判定逻辑（judgeAsk）+
 * 浏览器安全真相数据（truthData.generated）+ 居民列表（residents.ts），
 * 做确定性判定：命中真相表走 truth 分支，未命中走保守兜底文本（绝不调 LLM）。
 *
 * 与 api.ts 同形状（startLoop / ask / choice / memory），便于 api.ts 在无后端时无缝回退。
 * 所有逻辑均为纯数据驱动，无任何网络 / token 消耗。
 */
import { judgeAsk } from '@lunhui/engine/truth';
import type { AskResult, Resident } from '@lunhui/engine/types';
import { RESIDENTS } from './residents';
import { truthData } from './data/truthData.generated';
import { loopEvents, memoryRevenge, livingTownResidents } from './content/livingTown';
import type { AskResponse, ChoiceResponse, LoopResponse, MemoryResponse } from './api';

// 保守兜底文本：命中真相表失败时，不调 LLM，给一句留白式回应（节流且防失控）
const FALLBACK_TEXT = '（他望向雨里，没有接话。）';

// 离线会话状态（零后端，本地模拟一局轮回）
interface OfflineState {
  loopId: number;
  sequence: number;
  questionsLeft: number;
  memories: string[];
}
let state: OfflineState | null = null;

function freshState(): OfflineState {
  return { loopId: 1, sequence: 0, questionsLeft: 10, memories: [] };
}
function ensureState(): OfflineState {
  if (!state) state = freshState();
  return state;
}

/** 用浏览器安全数据拼出最小 Resident（judgeAsk 只消费 secretFacts.facts + name） */
function buildResident(residentId: string): Resident | undefined {
  const meta = RESIDENTS[residentId];
  const secretFacts = truthData.residentSecrets[residentId];
  if (!meta || !secretFacts) return undefined;
  return {
    id: residentId,
    name: meta.name,
    archetype: '',
    age: 0,
    role: meta.role,
    appearance: '',
    persona: '',
    speechStyle: '',
    quirks: [],
    secretFacts,
    relations: [],
  };
}

export const offlineApi = {
  startLoop(): Promise<LoopResponse> {
    state = freshState();
    // 用 loopEvents 的 loop-start 事件驱动开场氛围（离线叙事数据源）
    const loopStart = loopEvents.find((e) => e.trigger === 'loop-start');
    return Promise.resolve({
      loopId: state.loopId,
      sequence: state.sequence,
      intro: loopStart?.text ?? '渡口。雨没停过。你又从水里醒来——这一次，你记得一点点东西。',
      questionsLeft: state.questionsLeft,
      activeResidents: Object.keys(RESIDENTS),
      events: [],
    });
  },

  async ask(loopId: number, residentId: string, question: string): Promise<AskResponse> {
    const s = ensureState();
    const resident = buildResident(residentId);

    let result: AskResult;
    if (!resident) {
      // 未知居民：保守兜底，不调 LLM
      result = { answer: FALLBACK_TEXT, answerMode: 'silence', usedLlm: false, pause: false };
    } else {
      result = await judgeAsk(question, resident, async () => ({
        text: FALLBACK_TEXT,
        usedLlm: false,
      }));
    }

    // engine 返回局部 factId（如 f2）；livingTown 用 <居民id>:<局部factId> 全局方案（如 r5:f2）。
    // 拼接全局 key 以便与 loopEvents / memoryRevenge 对齐（不修改 livingTown.ts）。
    const globalFactId = result.hitFactId ? `${residentId}:${result.hitFactId}` : undefined;

    // 命中真相表事实 → 用 loopEvents 的 fact-hit 事件补充叙事
    let answerText = result.answer;
    if (globalFactId) {
      const factEvent = loopEvents.find((e) => e.trigger === 'fact-hit' && e.factId === globalFactId);
      if (factEvent) answerText = `${answerText}\n${factEvent.text}`;
    }

    // 命中关键事实 → 累计为「记忆」，供 memory 相位回响
    if (result.hitFactId && result.pause) {
      s.memories.push(answerText);
      // 跨轮回记忆复仇：匹配的 factId 注入记忆回响
      const revenge = memoryRevenge.find((m) => m.factId === globalFactId);
      if (revenge) s.memories.push(revenge.line);
    }
    s.questionsLeft = Math.max(0, s.questionsLeft - 1);
    s.sequence += 1;

    return {
      loopId,
      sequence: s.sequence,
      answer: answerText,
      answerMode: result.answerMode,
      hitFactId: result.hitFactId,
      pause: result.pause,
      questionsLeft: s.questionsLeft,
      residentMood: result.answerMode === 'direct' ? 'open' : 'guarded',
      loopStatus: s.questionsLeft <= 0 ? 'ready-to-choose' : 'ongoing',
      usedLlm: result.usedLlm,
    };
  },

  choice(loopId: number, choice: 'leave' | 'stay'): Promise<ChoiceResponse> {
    return Promise.resolve({
      accepted: true,
      consequence:
        choice === 'leave'
          ? '你又上船了。第七次了。'
          : '你留下来，也留不住。你本来就属于水里。',
      loopStatus: 'ended',
    });
  },

  memory(): Promise<MemoryResponse> {
    const s = ensureState();
    return Promise.resolve({
      memories: s.memories.map((content, i) => ({
        content,
        strength: 1,
        loop_id: s.loopId + i,
      })),
    });
  },
};

export type OfflineApi = typeof offlineApi;
