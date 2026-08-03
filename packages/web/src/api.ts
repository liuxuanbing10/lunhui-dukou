/**
 * API 客户端（对齐 docs/API_CONTRACT.md）
 *
 * 在线模式：直接打 /api。离线模式（VITE_OFFLINE==='true'）或后端不可达时，
 * 自动回退到 offlineClient（零后端 / 零 LLM token 的确定性判定），保证 web 直接可玩。
 */
import { offlineApi } from './offlineClient';
import type { AnswerMode } from '@lunhui/engine/types';

export interface LoopResponse {
  loopId: number;
  sequence: number;
  intro: string;
  questionsLeft: number;
  activeResidents: string[];
  events: Array<{ id: number; type: string; content: string }>;
}

export interface AskResponse {
  loopId: number;
  sequence: number;
  answer: string;
  answerMode: AnswerMode;
  hitFactId?: string;
  pause: boolean;
  questionsLeft: number;
  residentMood: string;
  loopStatus: string;
  usedLlm: boolean;
}

export interface ChoiceResponse {
  accepted: boolean;
  consequence: string;
  loopStatus: string;
}

export interface MemoryResponse {
  memories: Array<{ content: string; strength: number; loop_id: number }>;
}

const BASE = '/api';

/** 强制离线：构建期注入 VITE_OFFLINE=true 可完全不走后端 */
const OFFLINE = import.meta.env.VITE_OFFLINE === 'true';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    throw new Error(body.error?.message ?? body.error?.code ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * 在线优先、离线兜底。OFFLINE 为真时直接走离线；否则先试在线，失败（无后端）自动切离线。
 * offline 以惰性工厂传入，避免在线成功时白跑判定。
 */
function withOfflineFallback<T>(online: Promise<T>, offline: () => Promise<T>): Promise<T> {
  return OFFLINE ? offline() : online.catch(() => offline());
}

export const api = {
  startLoop: () =>
    withOfflineFallback(
      request<LoopResponse>('/loop', { method: 'POST', body: '{}' }),
      () => offlineApi.startLoop(),
    ),
  ask: (loopId: number, residentId: string, question: string) =>
    withOfflineFallback(
      request<AskResponse>('/ask', {
        method: 'POST',
        body: JSON.stringify({ loop_id: loopId, resident_id: residentId, question }),
      }),
      () => offlineApi.ask(loopId, residentId, question),
    ),
  choice: (loopId: number, choice: string) =>
    withOfflineFallback(
      request<ChoiceResponse>(`/loop/${loopId}/choice`, { method: 'POST', body: JSON.stringify({ choice }) }),
      () => offlineApi.choice(loopId, choice as 'leave' | 'stay'),
    ),
  memory: () =>
    withOfflineFallback(request<MemoryResponse>('/memory'), () => offlineApi.memory()),
};
