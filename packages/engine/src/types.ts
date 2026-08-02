/**
 * @lunhui/engine 核心数据类型
 * 对齐 docs/DATA_MODEL.md 与 docs/API_CONTRACT.md
 */

/** 真相表中的一条事实 */
export interface Fact {
  id: string;
  statement: string;
  /** 是否关键事实（命中 → pause:true 汤主沉默三秒） */
  isKey: boolean;
}

/** 居民的真相表（谜底，不可变） */
export interface SecretFacts {
  facts: Fact[];
  /** 完整真相（供主创/调试查看，不直接喂给 LLM 生成） */
  truth: string;
}

/** 关系网中的一条关系 */
export interface Relation {
  targetId: string;
  stance: string;
  note?: string;
}

/** 居民人格卡（对齐 docs/RESIDENTS.md） */
export interface Resident {
  id: string;
  name: string;
  archetype: string;
  age: number;
  role: string;
  appearance: string;
  persona: string;
  speechStyle: string;
  quirks: string[];
  secretFacts: SecretFacts;
  relations: Relation[];
}

/** 审问回答模式（对齐 API_CONTRACT answer_mode） */
export type AnswerMode = 'direct' | 'deny' | 'silence' | 'rhetoric';

/** 审问判定结果（对齐 POST /api/ask 响应） */
export interface AskResult {
  answer: string;
  answerMode: AnswerMode;
  /** 命中的真相表事实 id（未命中为 undefined） */
  hitFactId?: string;
  /** 命中关键事实 → 前端演出"汤主沉默三秒" */
  pause: boolean;
  /** 是否走 LLM 生成（false = 纯规则判定，省钱） */
  usedLlm: boolean;
}

/** 问题与事实的匹配结果（内部） */
export interface MatchResult {
  fact?: Fact;
  matched: boolean;
  /** 匹配到的关键词/别名（用于解释，可选） */
  keyword?: string;
}
