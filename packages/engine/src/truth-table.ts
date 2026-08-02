/**
 * TruthTable 真相表判定引擎
 * --------------------------------------------
 * 核心职责：把玩家的问题映射到居民真相表的事实（Fact），
 * 决定回答模式。能命中真相表的判定**不调 LLM**（纯规则，省钱且防失控）。
 *
 * 设计约束（docs/CONTENT_ASSETS.md §2）：
 * - 命中 isKey=true  → direct + pause（汤主沉默三秒）
 * - 命中 isKey=false → direct（可给，语气保留）
 * - 未命中任何 fact  → 交 LLM 生成（调用方决定），此处返回 deny/silence 建议
 * - 问"真相本身"    → silence 或反问，不直接揭底
 * - 红线：不得发明真相表之外的新事实（本引擎只做匹配，不做生成）
 */
import type { AnswerMode, AskResult, Fact, MatchResult, Resident } from './types.js';

/**
 * 问题归一化：去标点、去空格、转小写。
 * 中文无大小写，但兼容英文关键词。
 */
function normalize(question: string): string {
  return question
    .toLowerCase()
    .replace(/[\s，。？！、；：""''「」【】（）()—\-—,.?!;:'"`~]/g, '')
    .trim();
}

/**
 * 每个事实可配置"触发关键词"，用于规则匹配。
 * 词越具体越好；通用词（"你""我"）会导致误命中，禁用。
 */
const FACT_KEYWORDS: Record<string, string[]> = {
  // r1 蓑衣人
  f1_r1: ['捞过', '捞我', '捞了', '7次', '七次', '几次', '多少次'],
  f2_r1: ['弟弟', '兄弟', '老王', '面馆'],
  f3_r1: ['涨水', '每年', '为什么来', '来渡口'],
  // r2 阿岚
  f1_r2: ['白花', '放花', '渡口放', '给谁', '等谁'],
  f2_r2: ['未婚夫', '船难', '失踪', '7年前', '七年前'],
  f3_r2: ['见过我', '上辈子', '认得我', '认识我'],
  // r3 老王
  f1_r3: ['多煮', '那碗面', '角落', '给谁'],
  f2_r3: ['弟弟', '20年前', '二十年', '死', '落水'],
  f3_r3: ['眼熟', '见过', '哪里见过', '蓑衣'],
  // r4 阿黎
  f1_r4: ['纸人', '活', '夜里', '自己走', '走到渡口'],
  f2_r4: ['还愿', '替', '死者', '上船'],
  f3_r4: ['师傅', '失踪', '摆渡人', '别给'],
  // r5 何叔
  f1_r5: ['重复', '几次', '多少次', '30', '三十', '时间'],
  f2_r5: ['3:17', '三点十七', '钟停', '落水'],
  f3_r5: ['记得', '知道', '装', '装不知道'],
  // r6 老鲞
  f1_r6: ['船难', '没救', '在岸上', '7年前', '七年前'],
  f2_r6: ['女儿的鞋', '鞋子', '小孩的鞋', '船舱'],
  f3_r6: ['捞', '女儿', '出船', '找'],
  // r7 郑爷
  f1_r7: ['3:17', '三点十七', '渡口', '等人'],
  f2_r7: ['妻子', '30年', '三十年', '落水'],
  f3_r7: ['见过', '从水里', '假装', '没看见'],
  // r8 小满
  f1_r8: ['认识我', '我的名字', '每世', '怎么知道'],
  f2_r8: ['郑爷', '父亲', '妈妈', '孩子', '30年前'],
  f3_r8: ['第一世', '记得', '摆渡人', '记性'],
};

/** 需要"沉默/反问"的真相级问题（不能直接揭底） */
const TRUTH_PROBES = ['你是谁', '你到底是什么', '真相是什么', '这是哪里', '我在哪', '我死了吗', '渡口是什么'];

/** 获取事实的触发关键词 */
function keywordsFor(fact: Fact, residentId: string): string[] {
  return FACT_KEYWORDS[`${fact.id}_${residentId}`] ?? FACT_KEYWORDS[fact.id] ?? [];
}


/**
 * 匹配问题 → 事实。
 * 返回命中分数最高的事实；0 分则未命中。
 */
export function matchFact(question: string, resident: Resident): MatchResult {
  const q = normalize(question);

  // 0) 真相级试探：任何居民被问到"你是谁/真相"默认不揭底
  if (TRUTH_PROBES.some((p) => q.includes(p))) {
    return { matched: false };
  }

  // 1) 关键词匹配，取最高分
  let best: Fact | undefined;
  let bestScore = 0;
  let bestKeyword: string | undefined;
  for (const fact of resident.secretFacts.facts) {
    const kws = keywordsFor(fact, resident.id);
    let score = 0;
    let kwHit: string | undefined;
    for (const kw of kws) {
      if (q.includes(kw)) {
        score += 1;
        kwHit ??= kw;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = fact;
      bestKeyword = kwHit;
    }
  }

  if (best && bestScore > 0) {
    return { fact: best, matched: true, keyword: bestKeyword };
  }
  return { matched: false };
}

/**
 * 判定一次审问。
 * @param question 玩家问题
 * @param resident 被审问的居民
 * @param fallback 未命中真相表时，调用方提供的 LLM 生成回调（返回文本）
 * @returns AskResult（对齐 API 契约）
 */
export async function judgeAsk(
  question: string,
  resident: Resident,
  fallback?: (q: string, r: Resident) => Promise<string>,
): Promise<AskResult> {
  const match = matchFact(question, resident);

  if (!match.matched) {
    // 未命中：交给 LLM 生成（如果调用方提供了）；否则给保守回答
    if (fallback) {
      const text = await fallback(question, resident);
      return {
        answer: text,
        answerMode: 'rhetoric',
        usedLlm: true,
        pause: false,
      };
    }
    return {
      answer: '（他沉默地看着你，没有回答。）',
      answerMode: 'silence',
      usedLlm: false,
      pause: false,
    };
  }

  const fact = match.fact!;
  if (fact.isKey) {
    return {
      answer: `（${resident.name}停住了。${fact.statement}）`,
      answerMode: 'direct',
      hitFactId: fact.id,
      pause: true,
      usedLlm: false,
    };
  }
  return {
    answer: `（${resident.name}看了你一眼：${fact.statement}）`,
    answerMode: 'direct',
    hitFactId: fact.id,
    pause: false,
    usedLlm: false,
  };
}

export type { AnswerMode };
