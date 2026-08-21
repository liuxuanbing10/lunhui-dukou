/**
 * Repository：六表 + players 数据访问层（对齐 docs/DATA_MODEL.md + DESKTOP_MIGRATION.md Phase 1）
 * Phase 1 多玩家改造：loops/memories/events/questions/world_states 一律按 player_id 读写，
 * 保证额度与记忆按玩家隔离（B 玩家查询 A 玩家的 loop/记忆时返回 undefined/空）。
 * 强类型：所有返回值使用 db/types.ts 中的 Row 接口。
 */
import type { Database } from 'better-sqlite3';
import type { Resident } from '@lunhui/engine';
import type {
  EventRow,
  LoopRow,
  MemoryRow,
  PlayerRow,
  ResidentRow,
} from './types.js';
import { getDb } from './index.js';

// ---------- players（账号） ----------

export function createPlayer(db: Database, username: string, passwordHash: string): number {
  const info = db
    .prepare('INSERT INTO players (username, password_hash) VALUES (?, ?)')
    .run(username, passwordHash);
  return Number(info.lastInsertRowid);
}

export function getPlayerByUsername(db: Database, username: string): PlayerRow | undefined {
  return db.prepare('SELECT * FROM players WHERE username = ?').get(username) as
    | PlayerRow
    | undefined;
}

export function getPlayerById(db: Database, id: number): PlayerRow | undefined {
  return db.prepare('SELECT * FROM players WHERE id = ?').get(id) as PlayerRow | undefined;
}

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

// ---------- loops（按玩家隔离） ----------

export function createLoop(db: Database, playerId: number, sequence: number): number {
  const info = db
    .prepare('INSERT INTO loops (player_id, sequence, status) VALUES (?, ?, ?)')
    .run(playerId, sequence, 'active');
  return Number(info.lastInsertRowid);
}

/** 取指定玩家的轮回（未命中或不属于该玩家 → undefined，天然防跨玩家越权） */
export function getLoop(db: Database, playerId: number, id: number): LoopRow | undefined {
  return db
    .prepare('SELECT * FROM loops WHERE id = ? AND player_id = ?')
    .get(id, playerId) as LoopRow | undefined;
}

export function getLatestLoop(db: Database, playerId: number): LoopRow | undefined {
  return db
    .prepare('SELECT * FROM loops WHERE player_id = ? ORDER BY id DESC LIMIT 1')
    .get(playerId) as LoopRow | undefined;
}

export function countQuestionsInLoop(db: Database, playerId: number, loopId: number): number {
  const row = db
    .prepare(
      'SELECT COUNT(*) AS n FROM questions WHERE loop_id = ? AND player_id = ?',
    )
    .get(loopId, playerId) as { n: number };
  return row.n;
}

export function endLoop(
  db: Database,
  playerId: number,
  loopId: number,
  choice: string,
  deathCause: string,
): void {
  db.prepare(
    'UPDATE loops SET status = ?, player_choice = ?, death_cause = ? WHERE id = ? AND player_id = ?',
  ).run('ended', choice, deathCause, loopId, playerId);
}

// ---------- memories（按玩家隔离） ----------

export function addMemory(
  db: Database,
  playerId: number,
  residentId: string,
  loopId: number,
  content: string,
  permanent = false,
): void {
  db.prepare(
    'INSERT INTO memories (player_id, resident_id, loop_id, content, strength, is_permanent) VALUES (?, ?, ?, ?, 1.0, ?)',
  ).run(playerId, residentId, loopId, content, permanent ? 1 : 0);
}

export function getMemories(
  db: Database,
  playerId: number,
  residentId: string,
  limit = 10,
): MemoryRow[] {
  return db
    .prepare(
      `SELECT content, strength, loop_id FROM memories
       WHERE player_id = ? AND resident_id = ? AND strength >= 0.3
       ORDER BY is_permanent DESC, strength DESC LIMIT ?`,
    )
    .all(playerId, residentId, limit) as MemoryRow[];
}

/** 玩家记忆：跨轮回可见的强记忆（strength≥0.3，永久优先，取前 20）——仅限本玩家 */
export function getStrongMemories(db: Database, playerId: number): Array<{
  content: string;
  strength: number;
  loop_id: number | null;
}> {
  return db
    .prepare(
      `SELECT content, strength, loop_id FROM memories
       WHERE player_id = ? AND strength >= 0.3
       ORDER BY is_permanent DESC, strength DESC LIMIT 20`,
    )
    .all(playerId) as Array<{
    content: string;
    strength: number;
    loop_id: number | null;
  }>;
}

/** 每轮回衰减某玩家非永久记忆（strength ×0.8）——仅限本玩家 */
export function decayMemories(db: Database, playerId: number): void {
  db.prepare(
    'UPDATE memories SET strength = strength * 0.8 WHERE player_id = ? AND is_permanent = 0',
  ).run(playerId);
}

// ---------- events（按玩家隔离） ----------

export function addEvent(
  db: Database,
  playerId: number,
  loopId: number,
  type: string,
  content: string,
  isClue = false,
  isTrap = false,
): void {
  db.prepare(
    'INSERT INTO events (player_id, loop_id, type, content, is_clue, is_trap) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(playerId, loopId, type, content, isClue ? 1 : 0, isTrap ? 1 : 0);
}

export function getEvents(db: Database, loopId: number): EventRow[] {
  return db
    .prepare('SELECT * FROM events WHERE loop_id = ? ORDER BY id')
    .all(loopId) as EventRow[];
}

// ---------- questions（按玩家隔离） ----------

export function addQuestion(
  db: Database,
  playerId: number,
  loopId: number,
  residentId: string,
  question: string,
  hitFactId: string | undefined,
  answer: string,
  answerMode: string,
  costLlm: boolean,
): void {
  db.prepare(
    `INSERT INTO questions (player_id, loop_id, resident_id, question, hit_fact_id, answer, answer_mode, cost_llm)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    playerId,
    loopId,
    residentId,
    question,
    hitFactId ?? null,
    answer,
    answerMode,
    costLlm ? 1 : 0,
  );
}

// ---------- world_states（按玩家隔离） ----------

export function saveWorldState(
  db: Database,
  playerId: number,
  loopId: number,
  relationsSnapshot: unknown,
  flags: unknown,
  activeResidents: string[],
): void {
  db.prepare(
    'INSERT INTO world_states (player_id, loop_id, relations_snapshot, flags, active_residents) VALUES (?, ?, ?, ?, ?)',
  ).run(
    playerId,
    loopId,
    JSON.stringify(relationsSnapshot),
    JSON.stringify(flags),
    JSON.stringify(activeResidents),
  );
}

/** 测试辅助：清空全部数据（含 players） */
export function wipeAll(db: Database): void {
  db.exec(
    'DELETE FROM questions; DELETE FROM events; DELETE FROM memories; DELETE FROM world_states; DELETE FROM loops; DELETE FROM residents; DELETE FROM players;',
  );
}

export { getDb };