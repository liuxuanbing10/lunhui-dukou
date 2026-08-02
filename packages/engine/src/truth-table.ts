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

/** 获取事实的触发关键词（数据驱动：来自角色文件的 fact.keywords） */
function keywordsFor(fact: Fact): string[] {
  return fact.keywords ?? [];
}
const TRUTH_PROBES = ['你是谁', '你到底是什么', '真相是什么', '这是哪里', '我在哪', '我死了吗', '渡口是什么'];

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
    const kws = keywordsFor(fact);
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

/** fallback 回调：返回纯文本（视为 LLM 生成）或结构化结果（可标记 usedLlm=false 省钱） */
export type AskFallback = (
  q: string,
  r: Resident,
) => Promise<string | { text: string; usedLlm?: boolean }>;

/**
 * 判定一次审问。
 * @param question 玩家问题
 * @param resident 被审问的居民
 * @param fallback 未命中真相表时，调用方提供的生成回调（LLM 或保守回答）
 * @returns AskResult（对齐 API 契约）
 */
export async function judgeAsk(
  question: string,
  resident: Resident,
  fallback?: AskFallback,
): Promise<AskResult> {
  const match = matchFact(question, resident);

  if (!match.matched) {
    // 未命中：交给 fallback（调用方提供）。fallback 可返回纯文本（视为 LLM 生成），
    // 或 { text, usedLlm } 结构（保守回答 usedLlm=false，省钱）
    if (fallback) {
      const out = await fallback(question, resident);
      const text = typeof out === 'string' ? out : out.text;
      const usedLlm = typeof out === 'string' ? true : (out.usedLlm ?? true);
      return {
        answer: text,
        answerMode: 'rhetoric',
        usedLlm,
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
