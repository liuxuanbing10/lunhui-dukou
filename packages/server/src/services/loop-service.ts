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

/** 剧情引导 fallback（未命中真相表时）
 * Phase 1 第一夜引导（PHASE1_STORY.md）：玩家问"多出来的是谁/第9个"时，
 * 非蓑衣人给指向蓑衣人的线索，把玩家引向核心审问对象。
 */
async function conservativeFallback(
  question: string,
  resident: Resident,
): Promise<{ text: string; usedLlm: false }> {
  // 引导问题：谁是第 9 个 / 多出来的是谁 / 船上的人
  const guidePattern = /第9个|第九个|多出来|多了一个|船上|9个|九个人|人数/;
  if (guidePattern.test(question) && resident.id !== 'r1') {
    const hints: Record<string, string> = {
      r2: '（阿岚低头摆弄白花，声音轻了：石阶上……那个位置，是给没等到的人的。她没看你，但她的目光往渡口扫了一下。）',
      r3: '（老王擦着碗，看了一眼门外：那个人……我不认识，但总想给他添碗面。他顿了顿：他去渡口了。）',
      r4: '（阿黎缩了缩脖子，小声说：渡口……渡口那个人，夜里也在。他不敢看门口。）',
      r5: '（何叔头也不抬，继续调钟：3:17。水岸交界的时候，他在渡口。齿轮咔嗒一声。）',
      r6: '（老鲞嗓门大，但这次压低了：那个穿蓑衣的？他不是人。他笑了笑：但他总在渡口。）',
      r7: '（郑爷提灯照了照你，只说了一个字：别问。灯往渡口方向偏了偏。）',
      r8: '（小满抱着布包，静静看着你：那个人是最苦的。他捞了七次。每次都不记得他。）',
    };
    return { text: hints[resident.id] ?? '（他看了你一眼，指了指渡口的方向。）', usedLlm: false };
  }

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
