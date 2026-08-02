/**
 * LoopService：轮回状态机（对齐 docs/API_CONTRACT.md 与 docs/DATA_MODEL.md）
 *
 * 生命周期：new → asking → choice → ended
 * 额度：每轮回 10 问（server 层强制，不信任前端）
 * 判定：命中真相表 → 纯规则（不调 LLM）；未命中 → fallback（先保守回答，后续接 LLM）
 */
import type { Database } from 'better-sqlite3';
import { judgeAsk, type Resident } from '@lunhui/engine';
import {
  addEvent,
  addMemory,
  addQuestion,
  countQuestionsInLoop,
  createLoop,
  decayMemories,
  endLoop,
  getAllResidents,
  getEvents,
  getLoop,
  getResidentRow,
  saveWorldState,
} from '../db/repository.js';
import { getDb } from '../db/index.js';

export const MAX_QUESTIONS = 10;

export interface AskOutcome {
  loopId: number;
  sequence: number;
  answer: string;
  answerMode: 'direct' | 'deny' | 'silence' | 'rhetoric';
  hitFactId?: string;
  pause: boolean;
  questionsLeft: number;
  residentMood: string;
  loopStatus: string;
  /** 是否走了 LLM（false = 纯规则判定） */
  usedLlm: boolean;
}

export interface NewLoopOutcome {
  loopId: number;
  sequence: number;
  intro: string;
  questionsLeft: number;
  activeResidents: string[];
  events: Array<Record<string, unknown>>;
}

export interface ChoiceOutcome {
  accepted: boolean;
  consequence: string;
  loopStatus: string;
}

/** 把 DB row 转回 engine Resident 类型（用于 judgeAsk） */
function rowToResident(row: Record<string, unknown>): Resident {
  return {
    id: row.id as string,
    name: row.name as string,
    archetype: row.archetype as string,
    age: (row.age as number) ?? 0,
    role: row.role as string,
    appearance: (row.appearance as string) ?? '',
    persona: row.persona as string,
    speechStyle: (row.speech_style as string) ?? '',
    quirks: JSON.parse((row.quirks as string) ?? '[]'),
    secretFacts: JSON.parse(row.secret_facts as string),
    relations: JSON.parse((row.relations as string) ?? '[]'),
  };
}

/** 开场白（Phase 1 第一夜，见 PHASE1_STORY.md） */
const INTRO = '雨夜。你从水里醒来。8 个人站在岸边，等你摆渡。你数了两次：9 个。再数，8 个。没人承认多出来的那个是谁。';

/** 保守 fallback（未命中真相表时，先不调 LLM；返回结构化结果标记 usedLlm=false） */
async function conservativeFallback(
  question: string,
  resident: Resident,
): Promise<{ text: string; usedLlm: false }> {
  const patterns: Array<{ re: RegExp; reply: string }> = [
    { re: /你是谁|你到底是什么/i, reply: '（他沉默地看着你，没有回答。）' },
    { re: /渡口是什么|这是哪里|我在哪/i, reply: '（雨声很大。他没有回答。）' },
  ];
  for (const p of patterns) {
    if (p.re.test(question)) return { text: p.reply, usedLlm: false };
  }
  return { text: `（${resident.name}看了你一眼，没有说话。雨还在下。）`, usedLlm: false };
}

/** 开始新轮回 */
export function startNewLoop(db: Database = getDb()): NewLoopOutcome {
  const latest = getLoop(db, Number(getLatestLoopId(db)) || 0);
  const sequence = latest ? (latest.sequence as number) + 1 : 1;

  // 轮回重置：非永久记忆衰减
  if (sequence > 1) decayMemories(db);

  const loopId = createLoop(db, sequence);
  const residents = getAllResidents(db);
  const activeResidents = residents.map((r) => r.id as string);

  // 开场事件
  addEvent(db, loopId, 'plot', INTRO, false, false);
  for (const r of residents.slice(0, 3)) {
    addEvent(db, loopId, 'ambient', `${r.name as string}在镇上。`, false, false);
  }

  saveWorldState(db, loopId, [], { started: true }, activeResidents);

  return {
    loopId,
    sequence,
    intro: INTRO,
    questionsLeft: MAX_QUESTIONS,
    activeResidents,
    events: getEvents(db, loopId),
  };
}

function getLatestLoopId(db: Database): number {
  const row = db.prepare('SELECT id FROM loops ORDER BY id DESC LIMIT 1').get() as
    | { id: number }
    | undefined;
  return row?.id ?? 0;
}

/** 审问（额度 + 真相表判定 + fallback） */
export async function askQuestion(
  loopId: number,
  residentId: string,
  question: string,
  db: Database = getDb(),
): Promise<AskOutcome> {
  const loop = getLoop(db, loopId);
  if (!loop) {
    throw new Error('LOOP_NOT_FOUND');
  }
  if (loop.status !== 'active') {
    throw new Error('LOOP_ENDED');
  }

  // 额度强制（server 层）
  const asked = countQuestionsInLoop(db, loopId);
  if (asked >= MAX_QUESTIONS) {
    throw new Error('NO_QUESTIONS_LEFT');
  }

  const row = getResidentRow(db, residentId);
  if (!row || row.is_active === 0) {
    throw new Error('RESIDENT_NOT_ACTIVE');
  }
  const resident = rowToResident(row);

  // 真相表判定（纯规则优先，不烧 LLM）
  const result = await judgeAsk(question, resident, conservativeFallback);

  addQuestion(
    db,
    loopId,
    residentId,
    question,
    result.hitFactId,
    result.answer,
    result.answerMode,
    result.usedLlm,
  );

  // 关键命中 → 写入记忆（世界记得你）
  if (result.hitFactId) {
    const fact = resident.secretFacts.facts.find((f) => f.id === result.hitFactId);
    if (fact) {
      addMemory(db, residentId, loopId, `${resident.name}提到：${fact.statement}`, false);
    }
  }

  const left = MAX_QUESTIONS - countQuestionsInLoop(db, loopId);
  return {
    loopId,
    sequence: loop.sequence as number,
    answer: result.answer,
    answerMode: result.answerMode,
    hitFactId: result.hitFactId,
    pause: result.pause,
    questionsLeft: left,
    residentMood: result.pause ? 'stirred' : 'calm',
    loopStatus: 'active',
    usedLlm: result.usedLlm,
  };
}

/** 关键选择（结束轮回） */
export function makeChoice(loopId: number, choice: string, db: Database = getDb()): ChoiceOutcome {
  const loop = getLoop(db, loopId);
  if (!loop) {
    throw new Error('LOOP_NOT_FOUND');
  }

  const consequences: Record<string, string> = {
    leave: '船在河心沉没。你从水里又醒来——第七次了。',
    stay: '你留下来，也留不住。你本来就属于水里。',
  };
  const consequence = consequences[choice] ?? '（你做了选择。天亮时，轮回重置了。）';

  endLoop(db, loopId, choice, consequence);

  return { accepted: true, consequence, loopStatus: 'ended' };
}

/** 玩家记忆查询 */
export function playerMemory(db: Database = getDb()): Array<Record<string, unknown>> {
  // Phase 1：聚合所有居民的强记忆（后续可按玩家视角过滤）
  const rows = db
    .prepare(
      `SELECT content, strength, loop_id FROM memories
       WHERE strength >= 0.3 ORDER BY is_permanent DESC, strength DESC LIMIT 20`,
    )
    .all() as Array<Record<string, unknown>>;
  return rows;
}

export { getEvents };
