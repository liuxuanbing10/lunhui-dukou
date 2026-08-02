/**
 * API 客户端（对齐 docs/API_CONTRACT.md）
 */

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
  answerMode: 'direct' | 'deny' | 'silence' | 'rhetoric';
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

export const api = {
  startLoop: () => request<LoopResponse>('/loop', { method: 'POST', body: '{}' }),
  ask: (loopId: number, residentId: string, question: string) =>
    request<AskResponse>('/ask', {
      method: 'POST',
      body: JSON.stringify({ loop_id: loopId, resident_id: residentId, question }),
    }),
  choice: (loopId: number, choice: string) =>
    request<ChoiceResponse>(`/loop/${loopId}/choice`, { method: 'POST', body: JSON.stringify({ choice }) }),
  memory: () => request<MemoryResponse>('/memory'),
};
