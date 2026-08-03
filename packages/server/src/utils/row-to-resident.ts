/**
 * 共享工具：数据库行 → Engine Resident 类型转换
 * 消除 loop-service.ts 与 llm-generator.test.ts 之间的重复代码。
 */
import type { Resident } from '@lunhui/engine';
import type { ResidentRow } from '../db/types.js';

/** 把 DB row 转回 engine Resident 类型（用于 judgeAsk / LLM 生成） */
export function rowToResident(row: ResidentRow): Resident {
  return {
    id: row.id,
    name: row.name,
    archetype: row.archetype,
    age: row.age ?? 0,
    role: row.role,
    appearance: row.appearance ?? '',
    persona: row.persona,
    speechStyle: row.speech_style ?? '',
    quirks: JSON.parse(row.quirks ?? '[]') as string[],
    secretFacts: JSON.parse(row.secret_facts) as Resident['secretFacts'],
    relations: JSON.parse(row.relations ?? '[]') as Resident['relations'],
  };
}
