/**
 * LoopService：轮回状态机（对齐 docs/API_CONTRACT.md 与 docs/DATA_MODEL.md）
 *
 * 生命周期：new → asking → choice → ended
 * 额度：每轮回 10 问（server 层强制，不信任前端）
 * 判定：命中真相表 → 纯规则（不调 LLM）；未命中 → LLM 血肉层（sophnet→deepseek→保守兜底）
 */
import type { Database } from 'better-sqlite3';
import { judgeAsk, DEATH_LINES } from '@lunhui/engine';
import type { AnswerMode } from '@lunhui/engine';
import { AppError } from '../utils/app-error.js';
import { generateAnswer } from './llm-generator.js';
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
  getLatestLoop,
  getLoop,
  getResidentRow,
  getStrongMemories,
  saveWorldState,
} from '../db/repository.js';
import { getDb } from '../db/index.js';
import type { EventRow } from '../db/types.js';
import { rowToResident } from '../utils/row-to-resident.js';

export const MAX_QUESTIONS = 10;

export interface AskOutcome {
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

export interface NewLoopOutcome {
  loopId: number;
  sequence: number;
  intro: string;
  questionsLeft: number;
  activeResidents: string[];
  events: EventRow[];
}

export interface ChoiceOutcome {
  accepted: boolean;
  consequence: string;
  loopStatus: string;
}

/** 开场白（Phase 1 第一夜，见 PHASE1_STORY.md） */
const INTRO =
  '雨夜。你从水里醒来。8 个人站在岸边，等你摆渡。你数了两次：9 个。再数，8 个。没人承认多出来的那个是谁。';

/** LLM 血肉层 fallback（未命中真相表时）
 * 引导问题（"多出来的是谁/第9个"）走预写台词（剧情设计，不烧 LLM）；
 * 其他问题走 LLM 生成（sophnet→deepseek→保守兜底）。
 */
async function conservativeFallback(
  question: string,
  resident: Parameters<typeof judgeAsk>[1],
  db: Database,
): Promise<{ text: string; usedLlm: boolean }> {
  // 引导问题：谁是第 9 个 / 多出来的是谁 / 船上的人（剧情设计，不走 LLM）
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

  // 其他问题 → LLM 生成（sophnet 主 → deepseek 备 → 保守兜底）
  const result = await generateAnswer(resident, question, db);
  return { text: result.text, usedLlm: result.provider !== 'none' };
}

/** 开始新轮回 */
export function startNewLoop(db: Database = getDb()): NewLoopOutcome {
  const latest = getLatestLoop(db);
  const sequence = latest ? latest.sequence + 1 : 1;

  // 轮回重置：非永久记忆衰减
  if (sequence > 1) decayMemories(db);

  const loopId = createLoop(db, sequence);
  const residents = getAllResidents(db);
  const activeResidents = residents.map((r) => r.id);

  // 开场事件
  addEvent(db, loopId, 'plot', INTRO, false, false);
  for (const r of residents.slice(0, 3)) {
    addEvent(db, loopId, 'ambient', `${r.name}在镇上。`, false, false);
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

/** 审问（额度 + 真相表判定 + fallback） */
export async function askQuestion(
  loopId: number,
  residentId: string,
  question: string,
  db: Database = getDb(),
): Promise<AskOutcome> {
  const loop = getLoop(db, loopId);
  if (!loop) {
    throw new AppError('LOOP_NOT_FOUND');
  }
  if (loop.status !== 'active') {
    throw new AppError('LOOP_ENDED');
  }

  // 额度强制（server 层）
  const asked = countQuestionsInLoop(db, loopId);
  if (asked >= MAX_QUESTIONS) {
    throw new AppError('NO_QUESTIONS_LEFT');
  }

  const row = getResidentRow(db, residentId);
  if (!row || row.is_active === 0) {
    throw new AppError('RESIDENT_NOT_ACTIVE');
  }
  const resident = rowToResident(row);

  // 真相表判定（纯规则优先，不烧 LLM）；未命中 → LLM 血肉层
  const result = await judgeAsk(question, resident, (q, r) => conservativeFallback(q, r, db));

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
    sequence: loop.sequence,
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
export function makeChoice(
  loopId: number,
  choice: string,
  db: Database = getDb(),
): ChoiceOutcome {
  const loop = getLoop(db, loopId);
  if (!loop) {
    throw new AppError('LOOP_NOT_FOUND');
  }

  const consequences: Record<string, string> = {
    leave: DEATH_LINES.leave,
    stay: DEATH_LINES.stay,
  };
  const consequence = consequences[choice] ?? '（你做了选择。天亮时，轮回重置了。）';

  endLoop(db, loopId, choice, consequence);

  return { accepted: true, consequence, loopStatus: 'ended' };
}

/** 玩家记忆查询（数据访问收编进 repository.getStrongMemories） */
export function playerMemory(db: Database = getDb()): Array<{
  content: string;
  strength: number;
  loop_id: number | null;
}> {
  return getStrongMemories(db);
}

export { getEvents };
