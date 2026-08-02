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
  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
