/**
 * truth.ts — 浏览器安全的真相表纯判定逻辑（无 node:fs / 无 resident-loader 依赖）
 * ----------------------------------------------------------------------------
 * 这里只放「纯函数」：问题归一化、关键词匹配、审问判定。
 * 不 import node:fs，也不 import ./resident-loader，因此可被浏览器打包（Vite）直接消费，
 * 用于离线模式（零后端 / 零 LLM token）的确定性判定。
 *
 * 服务端需要 fs 加载居民数据，请走 ./resident-loader；本文件刻意保持纯净，
 * 以便 web 端在浏览器里 import '@lunhui/engine/truth' 而不触发任何 Node 专属 API。
 */
import type { AnswerMode, AskResult, Fact, MatchResult, Resident } from './types.js';

/**
 * 问题归一化：去标点、去空格、转小写。
 * 中文无大小写，但兼容英文关键词。
 */
export function normalize(question: string): string {
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
 * （原 truth-table.ts 中内联的「打分」逻辑即在此函数内，无独立 score 函数。）
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
      const nkw = normalize(kw);
      if (q.includes(nkw)) {
        score += 1;
        kwHit ??= nkw;
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
