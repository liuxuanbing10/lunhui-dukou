/**
 * SQLite 连接与初始化
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA } from './schema.js';

let db: Database.Database | null = null;

/** 初始化数据库（幂等：建表 + 建索引） */
export function initDb(dbPath?: string): Database.Database {
  if (db) return db;
  const resolved =
    dbPath ??
    process.env.DB_PATH ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/lunhui.db');

  // 确保目录存在
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

// Phase 1 旧库迁移：为已存在的五张内容表补 player_id 列（幂等）。
// 新库由 SCHEMA 直接定义 player_id；旧 dev 库才需要 ALTER。
const MIGRATE_COLUMNS: Array<{ table: string; column: string; ddl: string }> = [
  {
    table: 'loops',
    column: 'player_id',
    ddl: 'ALTER TABLE loops ADD COLUMN player_id INTEGER NOT NULL DEFAULT 0',
  },
  {
    table: 'memories',
    column: 'player_id',
    ddl: 'ALTER TABLE memories ADD COLUMN player_id INTEGER NOT NULL DEFAULT 0',
  },
  {
    table: 'events',
    column: 'player_id',
    ddl: 'ALTER TABLE events ADD COLUMN player_id INTEGER NOT NULL DEFAULT 0',
  },
  {
    table: 'questions',
    column: 'player_id',
    ddl: 'ALTER TABLE questions ADD COLUMN player_id INTEGER NOT NULL DEFAULT 0',
  },
  {
    table: 'world_states',
    column: 'player_id',
    ddl: 'ALTER TABLE world_states ADD COLUMN player_id INTEGER NOT NULL DEFAULT 0',
  },
];

function migrate(database: Database.Database): void {
  for (const m of MIGRATE_COLUMNS) {
    const cols = database
      .prepare(`PRAGMA table_info(${m.table})`)
      .all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === m.column)) {
      database.exec(m.ddl);
    }
  }
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
