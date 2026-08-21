/**
 * 数据库 Schema（对齐 docs/DATA_MODEL.md + docs/DESKTOP_MIGRATION.md Phase 1）
 *
 * Phase 1 server 云端化补充（桌面客户端唯一后端）：
 *  1. 新增 players（玩家）表 —— 账号/鉴权基础；
 *  2. loops/memories/events/questions/world_states 五张内容表加 player_id：
 *     额度与记忆按玩家隔离，多玩家互不串、互不可见。
 *  说明：旧 dev 库若已存在（不含 player_id），由 db/index.ts 的 migrate() 用
 *       `ALTER TABLE ADD COLUMN player_id INTEGER NOT NULL DEFAULT 0` 补列，
 *       DEFAULT 0 为孤儿哨兵（旧单机数据映射到不存在的玩家，实际无影响）。
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  archetype TEXT NOT NULL,
  age INTEGER,
  role TEXT NOT NULL,
  appearance TEXT,
  persona TEXT NOT NULL,
  speech_style TEXT,
  quirks TEXT DEFAULT '[]',
  secret_facts TEXT NOT NULL,
  relations TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS loops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id),
  sequence INTEGER NOT NULL,
  player_choice TEXT,
  death_cause TEXT,
  death_knowledge TEXT,
  outcome TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id),
  resident_id TEXT NOT NULL REFERENCES residents(id),
  loop_id INTEGER REFERENCES loops(id),
  content TEXT NOT NULL,
  strength REAL DEFAULT 1.0,
  is_permanent INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id),
  loop_id INTEGER REFERENCES loops(id),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_clue INTEGER DEFAULT 0,
  is_trap INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id),
  loop_id INTEGER NOT NULL REFERENCES loops(id),
  resident_id TEXT NOT NULL REFERENCES residents(id),
  question TEXT NOT NULL,
  hit_fact_id TEXT,
  answer TEXT NOT NULL,
  answer_mode TEXT NOT NULL,
  cost_llm INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS world_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id),
  loop_id INTEGER REFERENCES loops(id),
  relations_snapshot TEXT NOT NULL,
  flags TEXT DEFAULT '{}',
  active_residents TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_resident ON memories(resident_id);
CREATE INDEX IF NOT EXISTS idx_memories_player ON memories(player_id);
CREATE INDEX IF NOT EXISTS idx_questions_loop ON questions(loop_id);
CREATE INDEX IF NOT EXISTS idx_questions_player ON questions(player_id);
CREATE INDEX IF NOT EXISTS idx_events_loop ON events(loop_id);
CREATE INDEX IF NOT EXISTS idx_events_player ON events(player_id);
CREATE INDEX IF NOT EXISTS idx_loops_player ON loops(player_id);
CREATE INDEX IF NOT EXISTS idx_loops_sequence ON loops(sequence);
`;