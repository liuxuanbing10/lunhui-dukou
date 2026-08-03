/**
 * 数据库行类型（对齐 schema.ts DDL）
 * 消除 Record<string, unknown>，让 TypeScript 真正保护数据访问层。
 */

export interface ResidentRow {
  id: string;
  name: string;
  archetype: string;
  age: number | null;
  role: string;
  appearance: string | null;
  persona: string;
  speech_style: string | null;
  quirks: string; // JSON array
  secret_facts: string; // JSON object
  relations: string; // JSON array
  is_active: number;
}

export interface LoopRow {
  id: number;
  sequence: number;
  player_choice: string | null;
  death_cause: string | null;
  death_knowledge: string | null;
  outcome: string | null;
  status: string;
}

export interface MemoryRow {
  id: number;
  resident_id: string;
  loop_id: number | null;
  content: string;
  strength: number;
  is_permanent: number;
}

export interface EventRow {
  id: number;
  loop_id: number | null;
  type: string;
  content: string;
  is_clue: number;
  is_trap: number;
}

export interface QuestionRow {
  id: number;
  loop_id: number;
  resident_id: string;
  question: string;
  hit_fact_id: string | null;
  answer: string;
  answer_mode: string;
  cost_llm: number;
}

export interface WorldStateRow {
  id: number;
  loop_id: number | null;
  relations_snapshot: string;
  flags: string;
  active_residents: string;
}
