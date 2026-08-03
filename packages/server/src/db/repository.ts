/**
 * Repository：六表数据访问层（对齐 docs/DATA_MODEL.md）
 * 强类型：所有返回值使用 db/types.ts 中的 Row 接口，消除 Record<string, unknown>。
 */
import type { Database } from 'better-sqlite3';
import type { Resident } from '@lunhui/engine';
import type {
  EventRow,
  LoopRow,
  MemoryRow,
  ResidentRow,
} from './types.js';
import { getDb } from './index.js';

// ---------- residents ----------

/** 插入或更新居民（幂等：INSERT OR REPLACE） */
export function upsertResident(db: Database, r: Resident): void {
  db.prepare(
    `INSERT OR REPLACE INTO residents
     (id, name, archetype, age, role, appearance, persona, speech_style, quirks, secret_facts, relations, is_active)
     VALUES (@id, @name, @archetype, @age, @role, @appearance, @persona, @speechStyle, @quirks, @secretFacts, @relations, 1)`,
  ).run({
    id: r.id,
    name: r.name,
    archetype: r.archetype,
    age: r.age,
    role: r.role,
    appearance: r.appearance,
    persona: r.persona,
    speechStyle: r.speechStyle,
    quirks: JSON.stringify(r.quirks),
    secretFacts: JSON.stringify(r.secretFacts),
    relations: JSON.stringify(r.relations),
  });
}

export function getAllResidents(db: Database): ResidentRow[] {
  return db
    .prepare('SELECT * FROM residents WHERE is_active = 1 ORDER BY id')
    .all() as ResidentRow[];
}

export function getResidentRow(db: Database, id: string): ResidentRow | undefined {
  return db
    .prepare('SELECT * FROM residents WHERE id = ?')
    .get(id) as ResidentRow | undefined;
}

// ---------- loops ----------

export function createLoop(db: Database, sequence: number): number {
  const info = db
    .prepare('INSERT INTO loops (sequence, status) VALUES (?, ?)')
    .run(sequence, 'active');
  return Number(info.lastInsertRowid);
}

export function getLoop(db: Database, id: number): LoopRow | undefined {
  return db
    .prepare('SELECT * FROM loops WHERE id = ?')
    .get(id) as LoopRow | undefined;
}

export function getLatestLoop(db: Database): LoopRow | undefined {
  return db
    .prepare('SELECT * FROM loops ORDER BY id DESC LIMIT 1')
    .get() as LoopRow | undefined;
}

export function countQuestionsInLoop(db: Database, loopId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM questions WHERE loop_id = ?')
    .get(loopId) as { n: number };
  return row.n;
}

export function endLoop(db: Database, loopId: number, choice: string, deathCause: string): void {
  db.prepare('UPDATE loops SET status = ?, player_choice = ?, death_cause = ? WHERE id = ?').run(
    'ended',
    choice,
    deathCause,
    loopId,
  );
}

// ---------- memories ----------

export function addMemory(
  db: Database,
  residentId: string,
  loopId: number,
  content: string,
  permanent = false,
): void {
  db.prepare(
    'INSERT INTO memories (resident_id, loop_id, content, strength, is_permanent) VALUES (?, ?, ?, 1.0, ?)',
  ).run(residentId, loopId, content, permanent ? 1 : 0);
}

export function getMemories(
  db: Database,
  residentId: string,
  limit = 10,
): MemoryRow[] {
  return db
    .prepare(
      `SELECT content, strength, loop_id FROM memories
       WHERE resident_id = ? AND strength >= 0.3
       ORDER BY is_permanent DESC, strength DESC LIMIT ?`,
    )
    .all(residentId, limit) as MemoryRow[];
}

/** 玩家记忆：跨轮回可见的强记忆（strength≥0.3，永久优先，取前 20） */
export function getStrongMemories(db: Database): Array<{
  content: string;
  strength: number;
  loop_id: number | null;
}> {
  return db
    .prepare(
      `SELECT content, strength, loop_id FROM memories
       WHERE strength >= 0.3 ORDER BY is_permanent DESC, strength DESC LIMIT 20`,
    )
    .all() as Array<{ content: string; strength: number; loop_id: number | null }>;
}

/** 每轮回衰减非永久记忆（strength ×0.8） */
export function decayMemories(db: Database): void {
  db.prepare('UPDATE memories SET strength = strength * 0.8 WHERE is_permanent = 0').run();
}

// ---------- events ----------

export function addEvent(
  db: Database,
  loopId: number,
  type: string,
  content: string,
  isClue = false,
  isTrap = false,
): void {
  db.prepare(
    'INSERT INTO events (loop_id, type, content, is_clue, is_trap) VALUES (?, ?, ?, ?, ?)',
  ).run(loopId, type, content, isClue ? 1 : 0, isTrap ? 1 : 0);
}

export function getEvents(db: Database, loopId: number): EventRow[] {
  return db
    .prepare('SELECT * FROM events WHERE loop_id = ? ORDER BY id')
    .all(loopId) as EventRow[];
}

// ---------- questions ----------

export function addQuestion(
  db: Database,
  loopId: number,
  residentId: string,
  question: string,
  hitFactId: string | undefined,
  answer: string,
  answerMode: string,
  costLlm: boolean,
): void {
  db.prepare(
    `INSERT INTO questions (loop_id, resident_id, question, hit_fact_id, answer, answer_mode, cost_llm)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(loopId, residentId, question, hitFactId ?? null, answer, answerMode, costLlm ? 1 : 0);
}

// ---------- world_states ----------

export function saveWorldState(
  db: Database,
  loopId: number,
  relationsSnapshot: unknown,
  flags: unknown,
  activeResidents: string[],
): void {
  db.prepare(
    'INSERT INTO world_states (loop_id, relations_snapshot, flags, active_residents) VALUES (?, ?, ?, ?)',
  ).run(loopId, JSON.stringify(relationsSnapshot), JSON.stringify(flags), JSON.stringify(activeResidents));
}

/** 测试辅助：清空全部数据 */
export function wipeAll(db: Database): void {
  db.exec(
    'DELETE FROM questions; DELETE FROM events; DELETE FROM memories; DELETE FROM world_states; DELETE FROM loops; DELETE FROM residents;',
  );
}

export { getDb };
